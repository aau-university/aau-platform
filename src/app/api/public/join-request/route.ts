/**
 * POST /api/public/join-request — public admission-form submission handler.
 *
 * Mirrors the contact-form pipeline:
 *   1. IP-keyed rate limit.
 *   2. Zod schema validation (honeypot must be empty).
 *   3. Internal payload.create with overrideAccess (the collection itself
 *      denies anonymous create).
 *   4. Never leak internal errors.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import { consumePublicFormRateLimit } from '@/lib/forms/consume-public-rate-limit'
import { extractClientIp, extractUserAgent } from '@/lib/request-ip'
import { JoinRequestValidationError, submitJoinRequest } from './submission'

// Upload caps. A public, anonymous endpoint must bound how much it will
// buffer into memory — without this an attacker can POST an arbitrarily large
// body (each file is read via `arrayBuffer()`), exhausting memory. These are
// app-level backstops; a reverse-proxy body-size limit (e.g. nginx
// `client_max_body_size`) should also be configured in production.
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per document / photo
const MAX_TOTAL_UPLOAD_BYTES = 32 * 1024 * 1024 // whole multipart body

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request.headers)
  const userAgent = extractUserAgent(request.headers)

  // Returns 429 when the visitor is over the window, 503 when the
  // limiter itself is unavailable (production without REDIS_URL).
  const limited = await consumePublicFormRateLimit(`join:${ip}`)
  if (limited) return limited

  // Reject oversized bodies BEFORE buffering (best-effort; Content-Length can
  // be omitted/spoofed, hence the per-file check below and the proxy backstop).
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_TOTAL_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, code: 'payload_too_large' }, { status: 413 })
  }

  let data: Record<string, unknown> = {}
  const files: Record<string, File> = {}

  try {
    const contentType = request.headers.get('Content-Type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      formData.forEach((value, key) => {
        if (value instanceof File) {
          files[key] = value
        } else {
          // Attempt numeric coercion for college/program IDs
          if (key === 'desiredCollege' || key === 'desiredProgram' || key === 'highSchoolGpa') {
            data[key] = value === 'undefined' || value === 'null' || value === '' ? undefined : value
          } else {
            data[key] = value
          }
        }
      })
    } else {
      data = await request.json()
    }
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_payload' }, { status: 400 })
  }

  // Per-file cap — a secondary guard once the parts are known (and the
  // authoritative one when Content-Length was absent).
  for (const file of Object.values(files)) {
    if (file && file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, code: 'file_too_large' }, { status: 413 })
    }
  }

  const parsed = joinRequestSchema.safeParse(data)
  if (!parsed.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[join-request] validation failed', parsed.error.format())
    }
    return NextResponse.json({ ok: false, code: 'validation_failed' }, { status: 400 })
  }

  const validatedData = parsed.data

  try {
    const payload = await getPayload({ config })

    await submitJoinRequest(payload, {
      data: validatedData,
      files,
      ip,
      userAgent,
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[join-request] create failed', err)
    }
    const validationError = err instanceof JoinRequestValidationError
    return NextResponse.json(
      { ok: false, code: validationError ? 'validation_failed' : 'server_error' },
      { status: validationError ? 400 : 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
