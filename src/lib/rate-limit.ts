import { createClient, type RedisClientType } from 'redis'

import {
  REDIS_CONFIGURATION_HINT,
  resolveRedisConnection,
  type RedisConnectionOptions,
} from './redis-connection'

/** Shared sliding-window rate limiter for public form submissions. */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the bucket would allow another request. */
  retryAfter: number
}

export interface RateLimiter {
  consume(key: string): RateLimitResult | Promise<RateLimitResult>
  reset(key?: string): void | Promise<void>
}

interface BucketEntry {
  /** Timestamps (ms) of requests still inside the window. */
  hits: number[]
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly windowMs: number
  private readonly max: number
  private readonly store = new Map<string, BucketEntry>()
  /** Override for tests. */
  private readonly now: () => number

  constructor(opts: { windowMs: number; max: number; now?: () => number }) {
    if (opts.windowMs <= 0) throw new Error('windowMs must be > 0')
    if (opts.max <= 0) throw new Error('max must be > 0')
    this.windowMs = opts.windowMs
    this.max = opts.max
    this.now = opts.now ?? (() => Date.now())
  }

  consume(key: string): RateLimitResult {
    const t = this.now()
    const cutoff = t - this.windowMs
    const entry = this.store.get(key) ?? { hits: [] }
    // Drop expired hits.
    entry.hits = entry.hits.filter((ts) => ts > cutoff)

    if (entry.hits.length >= this.max) {
      this.store.set(key, entry)
      const oldest = entry.hits[0] ?? t
      const retryAfter = Math.max(0, Math.ceil((oldest + this.windowMs - t) / 1000))
      return { allowed: false, remaining: 0, retryAfter }
    }

    entry.hits.push(t)
    this.store.set(key, entry)
    return {
      allowed: true,
      remaining: Math.max(0, this.max - entry.hits.length),
      retryAfter: 0,
    }
  }

  reset(key?: string): void {
    if (key === undefined) this.store.clear()
    else this.store.delete(key)
  }
}

const REDIS_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count >= max then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = 0
  if oldest[2] then
    retryAfter = math.max(0, math.ceil((tonumber(oldest[2]) + window - now) / 1000))
  end
  redis.call('PEXPIRE', key, window)
  return {0, 0, retryAfter}
end

redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, max - count - 1, 0}
`

export class RedisRateLimiter implements RateLimiter {
  private readonly windowMs: number
  private readonly max: number
  private readonly keyPrefix: string
  private readonly client: RedisClientType
  private connectPromise: Promise<RedisClientType> | null = null

  constructor(opts: {
    windowMs: number
    max: number
    connection: RedisConnectionOptions
    keyPrefix?: string
  }) {
    if (opts.windowMs <= 0) throw new Error('windowMs must be > 0')
    if (opts.max <= 0) throw new Error('max must be > 0')

    this.windowMs = opts.windowMs
    this.max = opts.max
    this.keyPrefix = opts.keyPrefix ?? 'rate-limit'
    // Structured options, not a URL: a password containing '/', '#', '?' or
    // '%' cannot survive being interpolated into a URI. See
    // src/lib/redis-connection.ts.
    this.client = createClient(opts.connection) as RedisClientType
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.client.isOpen) return this.client
    this.connectPromise ??= this.client.connect().then(() => this.client)
    return this.connectPromise
  }

  async consume(key: string): Promise<RateLimitResult> {
    // A Redis outage is an OPERATOR problem, not a request bug. Surfacing it
    // as `RateLimiterUnavailableError` lets the routes answer 503 instead of
    // leaking a bare 500 with an empty body — the failure mode this class of
    // error was introduced to eliminate. Fail-closed is preserved: the caller
    // rejects the submission either way.
    try {
      const client = await withTimeout(this.getClient(), 'connect')
      const now = Date.now()
      const result = await withTimeout(
        client.eval(REDIS_SLIDING_WINDOW_SCRIPT, {
          keys: [`${this.keyPrefix}:${key}`],
          arguments: [
            String(now),
            String(this.windowMs),
            String(this.max),
            `${now}:${crypto.randomUUID()}`,
          ],
        }),
        'consume',
      )

      const [allowed, remaining, retryAfter] = Array.isArray(result) ? result : []
      return {
        allowed: allowed === 1 || allowed === '1',
        remaining: Number(remaining ?? 0),
        retryAfter: Number(retryAfter ?? 0),
      }
    } catch (error) {
      if (isRateLimiterUnavailable(error)) throw error
      // Reset the memoised connect promise so the next request retries
      // instead of re-awaiting a permanently rejected promise.
      this.connectPromise = null
      throw new RateLimiterUnavailableError('Rate limiter backend is unavailable.', {
        cause: error,
      })
    }
  }

  async reset(key?: string): Promise<void> {
    const client = await this.getClient()
    if (key !== undefined) {
      await client.del(`${this.keyPrefix}:${key}`)
      return
    }

    for await (const scanKey of client.scanIterator({ MATCH: `${this.keyPrefix}:*` })) {
      await client.del(scanKey)
    }
  }
}

/**
 * Module-level singleton tuned for public forms. Reads env once at module
 * load — fine for the dev/single-process case this implementation targets.
 */
const WINDOW_SEC = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? '900', 10)
const MAX_REQ = Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '5', 10)
const WINDOW_MS = Number.isFinite(WINDOW_SEC) && WINDOW_SEC > 0 ? WINDOW_SEC * 1000 : 15 * 60 * 1000
const MAX_REQUESTS = Number.isFinite(MAX_REQ) && MAX_REQ > 0 ? MAX_REQ : 5
const REDIS_CONNECTION = resolveRedisConnection()

/**
 * Raised when the shared limiter cannot run at all — either production is
 * missing Redis configuration, or Redis is unreachable/slow. A dedicated class so
 * route handlers can distinguish "this deployment cannot rate limit right
 * now" (503, an operator problem) from "this request blew up" (500, a code
 * problem).
 *
 * `code` is a static discriminator: `instanceof` is correct within one
 * module graph but fails silently across duplicate module instances (dual
 * ESM/CJS load, a bundler splitting the module, a test that mocks this
 * module without preserving the real class). Falling back to the code means
 * a mis-resolved class degrades to the right 503 instead of a bare 500.
 */
export class RateLimiterUnavailableError extends Error {
  static readonly code = 'rate_limiter_unavailable'
  readonly code = RateLimiterUnavailableError.code

  constructor(
    message = `Redis must be configured in production for shared public form rate limiting. ${REDIS_CONFIGURATION_HINT}`,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'RateLimiterUnavailableError'
  }
}

/** True for a genuine limiter outage, tolerant of cross-realm class identity. */
export function isRateLimiterUnavailable(error: unknown): boolean {
  if (error instanceof RateLimiterUnavailableError) return true
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; name?: unknown }
  return (
    candidate.code === RateLimiterUnavailableError.code ||
    candidate.name === 'RateLimiterUnavailableError'
  )
}

/**
 * How long a single Redis round-trip may take before the limiter is treated
 * as unavailable. Without a bound, a hung Redis hangs the request handler
 * indefinitely and ties up a server slot per submission.
 */
const REDIS_TIMEOUT_MS = 2_000

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new RateLimiterUnavailableError(`Rate limiter ${label} timed out.`)),
        REDIS_TIMEOUT_MS,
      ).unref?.(),
    ),
  ])
}

const missingProductionRedisRateLimiter: RateLimiter = {
  consume() {
    throw new RateLimiterUnavailableError()
  },
  reset() {
    throw new RateLimiterUnavailableError()
  },
}

export const publicFormRateLimiter: RateLimiter = REDIS_CONNECTION
  ? new RedisRateLimiter({
      windowMs: WINDOW_MS,
      max: MAX_REQUESTS,
      connection: REDIS_CONNECTION.options,
    })
  : process.env.NODE_ENV === 'production'
    ? missingProductionRedisRateLimiter
  : new InMemoryRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS })

// Surface the misconfiguration in the server log. Next.js loads route-handler
// modules lazily, so this runs when the first form route is exercised rather
// than literally at process start — still far earlier and louder than a
// silent 503, because the deployment otherwise looks perfectly healthy: every
// page renders while nobody can reach the university.
//
// `next build` also sets NODE_ENV=production and imports every route module
// while collecting page data, and the build stage legitimately has no
// Redis configuration. Logging there would train operators to ignore the
// message, so the build phase is excluded.
if (
  !REDIS_CONNECTION &&
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  console.error(
    '[rate-limit] Redis is not configured. Every public form submission ' +
      '(contact, join-request, email-request) will be rejected with 503 ' +
      `until it is. ${REDIS_CONFIGURATION_HINT}`,
  )
}
