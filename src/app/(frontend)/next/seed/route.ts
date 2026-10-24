import config from '@payload-config'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import { isSuperAdmin } from '@/access'
import { safeEqual } from '@/lib/crypto/safeEqual'
import {
  runSeed,
  SeedAlreadyRunningError,
  SeedConnectionError,
} from '@/seed/run-seed'
import { getMeUser } from '@/utilities/getMeUser'

// Scratch runs take 30-50 minutes; match the dedicated 90-minute integration timeout.
export const maxDuration = 200
// Node.js is Next's default runtime; no explicit runtime export is needed under Cache Components.

const SEED_SECRET_PATTERN = /^[0-9a-f]{64}$/i
const SAFE_STAGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/
const loggedConfigFailures = new Set<ServerConfigFailureReason>()

type ErrorCode =
  | 'bad_request'
  | 'forbidden'
  | 'not_found'
  | 'seed_failed'
  | 'seed_in_progress'
  | 'unauthorized'
  | 'unavailable'

interface SeedServerConfig {
  origin: string
  secret: string
}

type ServerConfigFailureReason =
  | 'invalid_origin'
  | 'invalid_seed_secret'
  | 'production_http_origin'
  | 'production_loopback_origin'

type ServerConfigResult =
  | { config: SeedServerConfig; valid: true }
  | { reason: ServerConfigFailureReason; valid: false }

function jsonResponse(body: object, status: number): Response {
  return Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
    status,
  })
}

function errorResponse(
  error: ErrorCode,
  correlationId: string,
  status: number,
  stage?: string,
): Response {
  return jsonResponse(
    {
      error,
      success: false,
      correlationId,
      ...(stage ? { stage } : {}),
    },
    status,
  )
}

function validateServerConfig(): ServerConfigResult {
  const originResult = validateConfiguredOrigin(process.env.PAYLOAD_SERVER_ORIGIN)
  if (!originResult.valid) return originResult

  const secret = process.env.PAYLOAD_SEED_SECRET
  if (!secret || !SEED_SECRET_PATTERN.test(secret)) {
    return { reason: 'invalid_seed_secret', valid: false }
  }

  return { config: { origin: originResult.origin, secret }, valid: true }
}

function validateConfiguredOrigin(rawOrigin: string | undefined):
  | { origin: string; valid: true }
  | { reason: ServerConfigFailureReason; valid: false } {
  if (!rawOrigin || rawOrigin.trim() !== rawOrigin) {
    return { reason: 'invalid_origin', valid: false }
  }

  let url: URL
  try {
    url = new URL(rawOrigin)
  } catch {
    return { reason: 'invalid_origin', valid: false }
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (rawOrigin !== url.origin && rawOrigin !== `${url.origin}/`)
  ) {
    return { reason: 'invalid_origin', valid: false }
  }

  if (process.env.NODE_ENV === 'production') {
    if (url.protocol !== 'https:') return { reason: 'production_http_origin', valid: false }
    if (isLoopbackHostname(url.hostname)) {
      return { reason: 'production_loopback_origin', valid: false }
    }
  }

  return { origin: url.origin, valid: true }
}

function logInvalidServerConfigOnce(reason: ServerConfigFailureReason, correlationId: string): void {
  if (loggedConfigFailures.has(reason)) return
  loggedConfigFailures.add(reason)
  console.error('Seed endpoint server configuration is invalid', { correlationId, reason })
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true
  if (/^127(?:\.\d{1,3}){0,3}$/.test(normalized)) return true
  return (
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    /^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized)
  )
}

function hasValidOrigin(request: Request, configuredOrigin: string): boolean {
  const requestOrigin = request.headers.get('origin')
  if (!requestOrigin || requestOrigin === 'null' || requestOrigin.trim() !== requestOrigin) return false

  try {
    const parsed = new URL(requestOrigin)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.search === '' &&
      parsed.hash === '' &&
      requestOrigin === parsed.origin &&
      requestOrigin === configuredOrigin
    )
  } catch {
    return false
  }
}

function hasValidEmptyBodyFraming(request: Request): boolean {
  if (request.headers.has('transfer-encoding')) return false

  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) return /^0+$/.test(contentLength)

  // Node's HTTP parser guarantees that an unframed request has no message body,
  // even though Next may expose a non-null web stream for it.
  return true
}

function safeStageName(stage: unknown): string | undefined {
  return typeof stage === 'string' && SAFE_STAGE_NAME_PATTERN.test(stage) ? stage : undefined
}

function logPayloadFailure(
  payload: Payload,
  correlationId: string,
  errorType: string,
  stage?: string,
): void {
  try {
    payload.logger.error({
      correlationId,
      errorType,
      msg: 'Seed request failed',
      ...(stage ? { stage } : {}),
    })
  } catch {
    // Logging must not alter the HTTP failure contract.
  }
}

function logDependencyFailure(correlationId: string, errorType: string): void {
  try {
    console.error('Seed endpoint dependency is unavailable', { correlationId, errorType })
  } catch {
    // Logging must not alter the HTTP failure contract.
  }
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = randomUUID()

  if (process.env.PAYLOAD_SEED_ENABLED !== 'true') {
    return errorResponse('not_found', correlationId, 404)
  }

  const serverConfig = validateServerConfig()
  if (!serverConfig.valid) {
    logInvalidServerConfigOnce(serverConfig.reason, correlationId)
    return errorResponse('unavailable', correlationId, 503)
  }

  if (request.url.includes('?')) {
    return errorResponse('bad_request', correlationId, 400)
  }

  if (!hasValidEmptyBodyFraming(request)) {
    return errorResponse('bad_request', correlationId, 400)
  }

  if (!hasValidOrigin(request, serverConfig.config.origin)) {
    return errorResponse('forbidden', correlationId, 403)
  }

  const suppliedSecret = request.headers.get('x-payload-seed-secret')
  if (!suppliedSecret || !safeEqual(suppliedSecret, serverConfig.config.secret)) {
    return errorResponse('unauthorized', correlationId, 401)
  }

  let me: Awaited<ReturnType<typeof getMeUser>>
  try {
    me = await getMeUser()
  } catch {
    logDependencyFailure(correlationId, 'authentication_unavailable')
    return errorResponse('unavailable', correlationId, 503)
  }
  if (!me) {
    return errorResponse('unauthorized', correlationId, 401)
  }
  if (!isSuperAdmin(me.user)) {
    return errorResponse('forbidden', correlationId, 403)
  }

  let payload: Payload
  try {
    payload = await getPayload({ config })
  } catch {
    logDependencyFailure(correlationId, 'payload_initialization_unavailable')
    return errorResponse('unavailable', correlationId, 503)
  }

  let failedStage: string | undefined

  try {
    const result = await runSeed(payload, {
      onStageResult: (stageResult) => {
        if (stageResult.status === 'failed') failedStage = safeStageName(stageResult.name)
      },
    })

    return jsonResponse(
      {
        success: true,
        correlationId,
        summary: {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          conflict: result.conflict,
        },
        stages: result.stages,
      },
      200,
    )
  } catch (error) {
    if (error instanceof SeedAlreadyRunningError) {
      logPayloadFailure(payload, correlationId, 'seed_in_progress')
      return errorResponse('seed_in_progress', correlationId, 409)
    }
    if (error instanceof SeedConnectionError) {
      logPayloadFailure(payload, correlationId, 'unavailable')
      return errorResponse('unavailable', correlationId, 503)
    }

    logPayloadFailure(payload, correlationId, 'seed_failed', failedStage)
    return errorResponse('seed_failed', correlationId, 500, failedStage)
  }
}
