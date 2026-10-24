import { createHash, randomBytes } from 'node:crypto'

import type { CollectionSlug, Payload } from 'payload'
import { createClient, type RedisClientType } from 'redis'

import {
  REDIS_CONFIGURATION_HINT,
  resolveRedisConnection,
  type RedisConnectionOptions,
} from '../redis-connection'

export const PREVIEW_SESSION_QUERY = 'previewSession'
export const PREVIEW_SESSION_TTL_SECONDS = 30 * 60

const SESSION_KEY_PREFIX = 'aau:preview:session:'
const INDEX_KEY_PREFIX = 'aau:preview:index:'
const USER_INDEX_KEY_PREFIX = 'aau:preview:user:'

export type PreviewSession = {
  authSessionId: string
  collection: CollectionSlug
  createdAt: string
  documentId: string
  locale?: string
  purpose: 'live-preview' | 'preview'
  userId: string
  version: 1
}

export class PreviewSessionUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PreviewSessionUnavailableError'
  }
}

let client: RedisClientType | null = null
let connectPromise: Promise<RedisClientType> | null = null

function redisConnection(): RedisConnectionOptions {
  const resolved = resolveRedisConnection()
  if (!resolved) {
    throw new PreviewSessionUnavailableError(
      `Redis is not configured for Preview. ${REDIS_CONFIGURATION_HINT}`,
    )
  }
  return resolved.options
}

async function getClient(): Promise<RedisClientType> {
  if (!client) {
    const connection = redisConnection()
    client = createClient({
      ...connection,
      socket: { ...connection.socket, connectTimeout: 2_000, reconnectStrategy: false },
    }) as RedisClientType
  }
  if (client.isOpen) return client

  try {
    connectPromise ??= client.connect().then(() => client as RedisClientType)
    return await connectPromise
  } catch (error) {
    connectPromise = null
    throw new PreviewSessionUnavailableError('Redis is unavailable for Preview.', { cause: error })
  }
}

function indexKey(session: Pick<PreviewSession, 'authSessionId' | 'collection' | 'documentId' | 'locale' | 'purpose' | 'userId'>) {
  const identity = [
    session.userId,
    session.authSessionId,
    session.collection,
    session.documentId,
    session.purpose,
    session.locale ?? '',
  ].join('\0')
  return `${INDEX_KEY_PREFIX}${createHash('sha256').update(identity).digest('hex')}`
}

function sessionKey(token: string): string {
  return `${SESSION_KEY_PREFIX}${token}`
}

function userIndexKey(userId: string): string {
  return `${USER_INDEX_KEY_PREFIX}${createHash('sha256').update(userId).digest('hex')}`
}

const CREATE_OR_REUSE_SESSION = `
local existing = redis.call('GET', KEYS[1])
if existing and redis.call('EXISTS', ARGV[1] .. existing) == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  redis.call('EXPIRE', ARGV[1] .. existing, ARGV[2])
  redis.call('SADD', KEYS[2], KEYS[1])
  redis.call('EXPIRE', KEYS[2], ARGV[2])
  return existing
end

redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[2])
redis.call('SET', ARGV[1] .. ARGV[3], ARGV[4], 'EX', ARGV[2])
redis.call('SADD', KEYS[2], KEYS[1])
redis.call('EXPIRE', KEYS[2], ARGV[2])
return ARGV[3]
`

const DESTROY_SESSION = `
local indexed = redis.call('GET', KEYS[1])
redis.call('DEL', KEYS[2])
if indexed == ARGV[1] then
  redis.call('DEL', KEYS[1])
end
redis.call('SREM', KEYS[3], KEYS[1])
if redis.call('SCARD', KEYS[3]) == 0 then
  redis.call('DEL', KEYS[3])
end
return 1
`

const DESTROY_USER_SESSIONS = `
local indexes = redis.call('SMEMBERS', KEYS[1])
for _, indexKey in ipairs(indexes) do
  local token = redis.call('GET', indexKey)
  if token then
    redis.call('DEL', ARGV[1] .. token)
  end
  redis.call('DEL', indexKey)
end
redis.call('DEL', KEYS[1])
return #indexes
`

function isOpaqueToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

function safeLog(
  payload: Pick<Payload, 'logger'>,
  operation: string,
  error: unknown,
  context: Partial<Pick<PreviewSession, 'collection' | 'documentId' | 'userId'>> = {},
) {
  const candidate = error instanceof Error ? error : new Error('Unknown Preview session error')
  payload.logger.error({
    err: { message: candidate.message, name: candidate.name },
    operation,
    subsystem: 'preview-session',
    ...context,
  })
}

export async function createOrReusePreviewSession(args: {
  authSessionId: string
  collection: CollectionSlug
  documentId: number | string
  locale?: null | string
  payload: Pick<Payload, 'logger'>
  purpose: PreviewSession['purpose']
  userId: number | string
}): Promise<string> {
  const session: PreviewSession = {
    authSessionId: args.authSessionId,
    collection: args.collection,
    createdAt: new Date().toISOString(),
    documentId: String(args.documentId),
    purpose: args.purpose,
    userId: String(args.userId),
    version: 1,
    ...(args.locale ? { locale: args.locale } : {}),
  }

  try {
    const redis = await getClient()
    const token = randomBytes(32).toString('base64url')
    const result = await redis.eval(CREATE_OR_REUSE_SESSION, {
      keys: [indexKey(session), userIndexKey(session.userId)],
      arguments: [
        SESSION_KEY_PREFIX,
        String(PREVIEW_SESSION_TTL_SECONDS),
        token,
        JSON.stringify(session),
      ],
    })
    if (typeof result !== 'string' || !result) {
      throw new PreviewSessionUnavailableError('Redis returned an invalid Preview session token.')
    }
    return result
  } catch (error) {
    safeLog(args.payload, 'create-or-reuse', error, session)
    if (error instanceof PreviewSessionUnavailableError) throw error
    throw new PreviewSessionUnavailableError('Could not create the Preview session.', { cause: error })
  }
}

function isPreviewSession(value: unknown): value is PreviewSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<PreviewSession>
  return (
    session.version === 1 &&
    typeof session.authSessionId === 'string' &&
    session.authSessionId.length > 0 &&
    typeof session.userId === 'string' &&
    typeof session.collection === 'string' &&
    typeof session.documentId === 'string' &&
    typeof session.createdAt === 'string' &&
    (session.purpose === 'preview' || session.purpose === 'live-preview') &&
    (session.locale === undefined || typeof session.locale === 'string')
  )
}

export async function resolvePreviewSession(args: {
  payload: Pick<Payload, 'logger'>
  token: string
}): Promise<PreviewSession | null> {
  if (!isOpaqueToken(args.token)) return null
  try {
    const redis = await getClient()
    const serialized = await redis.get(sessionKey(args.token))
    if (!serialized) return null

    let session: unknown
    try {
      session = JSON.parse(serialized)
    } catch (error) {
      safeLog(args.payload, 'discard-corrupt', error)
      await redis.del(sessionKey(args.token))
      return null
    }
    if (!isPreviewSession(session)) {
      await redis.del(sessionKey(args.token))
      return null
    }

    return session
  } catch (error) {
    safeLog(args.payload, 'resolve', error)
    if (error instanceof PreviewSessionUnavailableError) throw error
    throw new PreviewSessionUnavailableError('Could not resolve the Preview session.', { cause: error })
  }
}

export async function destroyPreviewSession(args: {
  payload: Pick<Payload, 'logger'>
  token: string
}): Promise<void> {
  if (!isOpaqueToken(args.token)) return
  try {
    const redis = await getClient()
    const serialized = await redis.get(sessionKey(args.token))
    if (!serialized) return

    let session: unknown
    try {
      session = JSON.parse(serialized)
    } catch {
      await redis.del(sessionKey(args.token))
      return
    }
    if (!isPreviewSession(session)) {
      await redis.del(sessionKey(args.token))
      return
    }
    await redis.eval(DESTROY_SESSION, {
      keys: [
        indexKey(session),
        sessionKey(args.token),
        userIndexKey(session.userId),
      ],
      arguments: [args.token],
    })
  } catch (error) {
    safeLog(args.payload, 'destroy', error)
    if (error instanceof PreviewSessionUnavailableError) throw error
    throw new PreviewSessionUnavailableError('Could not destroy the Preview session.', { cause: error })
  }
}

/** Revoke every active Preview session owned by a Payload user. */
export async function destroyPreviewSessionsForUser(args: {
  payload: Pick<Payload, 'logger'>
  userId: number | string
}): Promise<number> {
  const userId = String(args.userId)
  try {
    const redis = await getClient()
    const result = await redis.eval(DESTROY_USER_SESSIONS, {
      keys: [userIndexKey(userId)],
      arguments: [SESSION_KEY_PREFIX],
    })
    return typeof result === 'number' ? result : Number(result) || 0
  } catch (error) {
    safeLog(args.payload, 'destroy-user-sessions', error, { userId })
    if (error instanceof PreviewSessionUnavailableError) throw error
    throw new PreviewSessionUnavailableError('Could not destroy the user Preview sessions.', {
      cause: error,
    })
  }
}

/** Test-only cleanup for isolated Redis containers. */
export async function disconnectPreviewSessionRedis(): Promise<void> {
  if (client?.isOpen) await client.quit()
  client = null
  connectPromise = null
}
