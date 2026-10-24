/**
 * How this deployment reaches Redis.
 *
 * ── Why this is not just `REDIS_URL` ──────────────────────────────────────
 * The VPS compose file used to assemble the URI by string interpolation:
 *
 *   REDIS_URL: redis://default:${REDIS_PASSWORD}@redis-prod:6379
 *
 * A password is an arbitrary byte string, and several characters that a
 * password generator will happily emit are STRUCTURAL in a URI. Measured
 * against Node's WHATWG URL parser:
 *
 *   p@ssw0rd   parses, but the password arrives percent-encoded
 *   a/b        Invalid URL
 *   has#hash   Invalid URL
 *   q?uery     Invalid URL
 *   per%cent   URI malformed
 *
 * So a perfectly legitimate strong password could make the application fail
 * to start, or — for the `@` case — silently authenticate with a different
 * string than the one Redis was configured with. Neither failure names the
 * password as the cause, and the natural "fix" an operator reaches for is a
 * weaker password.
 *
 * Structured options remove the parsing step entirely: host, port, username
 * and password are passed as separate values and never have to survive being
 * concatenated into, and re-parsed out of, a single string.
 *
 * `REDIS_URL` remains supported for local development and CI, where Redis is
 * passwordless and a URL is the convenient form.
 */

export interface RedisConnectionOptions {
  url?: string
  username?: string
  password?: string
  socket?: { host: string; port: number }
}

export interface ResolvedRedisConnection {
  options: RedisConnectionOptions
  /** How it was configured, for log messages that need to be actionable. */
  source: 'structured' | 'url'
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim()
  return result === undefined || result === '' ? undefined : result
}

/**
 * Resolve Redis connection options, or `null` when Redis is not configured
 * at all (local development without a limiter).
 *
 * Structured configuration wins when `REDIS_HOST` is present, so a deployment
 * that sets both does not silently depend on which one this function happens
 * to check first.
 */
export function resolveRedisConnection(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedRedisConnection | null {
  const host = trimmed(env.REDIS_HOST)

  if (host !== undefined) {
    const rawPort = trimmed(env.REDIS_PORT) ?? '6379'
    // Strict: `Number.parseInt('6379x', 10)` is 6379, so a typo would silently
    // resolve to a plausible-looking port instead of being reported.
    const port = /^[0-9]+$/.test(rawPort) ? Number.parseInt(rawPort, 10) : Number.NaN
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(
        `REDIS_PORT must be a valid TCP port; received ${JSON.stringify(rawPort)}. ` +
          'Refusing to guess a port for a service that carries session and rate-limit state.',
      )
    }

    return {
      source: 'structured',
      options: {
        socket: { host, port },
        // Passed through verbatim. No escaping, no encoding, no parsing.
        username: trimmed(env.REDIS_USERNAME) ?? 'default',
        password: env.REDIS_PASSWORD === '' ? undefined : env.REDIS_PASSWORD,
      },
    }
  }

  const url = trimmed(env.REDIS_URL)
  if (url !== undefined) return { source: 'url', options: { url } }

  return null
}

/** True when this deployment has Redis configured in either form. */
export function isRedisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveRedisConnection(env) !== null
}

/** The variable names to name in an operator-facing error. */
export const REDIS_CONFIGURATION_HINT =
  'Set REDIS_HOST (with REDIS_PORT/REDIS_USERNAME/REDIS_PASSWORD), or REDIS_URL for a passwordless local Redis.'
