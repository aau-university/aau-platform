/**
 * POST /api/public/email-request — public email-request form submission handler.
 *
 * Pipeline:
 *   1. Rate limit by client IP (Redis-backed in production).
 *   2. Validate body with Zod (emailRequestSchema). Honeypot must be empty.
 *   3. Resolve Payload via Local API and `payload.create` with
 *      overrideAccess:true — this is the ONLY path that can create
 *      email-request documents (the collection itself returns false).
 *   4. Persist client IP and user-agent metadata for abuse review.
 *   5. Return a small generic JSON response.
 *      IMPORTANT: Never return Zod details or internal errors to the client.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { emailRequestSchema } from '@/lib/forms/email-request-schema'
import { consumePublicFormRateLimit } from '@/lib/forms/consume-public-rate-limit'
import { extractClientIp, extractUserAgent } from '@/lib/request-ip'

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request.headers)
  const userAgent = extractUserAgent(request.headers)

  // 1. Rate limit
  // Returns 429 when the visitor is over the window, 503 when the
  // limiter itself is unavailable (production without REDIS_URL).
  const limited = await consumePublicFormRateLimit(`email-request:${ip}`)
  if (limited) return limited

  // 2. Parse body
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 })
  }

  // 3. Validate — never return Zod details to the client
  const parsed = emailRequestSchema.safeParse(raw)
  if (!parsed.success) {
    // Generic response — do NOT include Zod issue messages
    return NextResponse.json({ ok: false, code: 'validation_failed' }, { status: 400 })
  }

  const { fullName, studentId, college, program, phone, alternateEmail, requestType, notes } =
    parsed.data

  // 4. Persist via Local API with overrideAccess:true
  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'email-requests',
      overrideAccess: true,
      data: {
        fullName,
        studentId: studentId ?? '',
        college,
        program,
        phone: phone ?? '',
        alternateEmail: alternateEmail ?? '',
        requestType,
        notes: notes ?? '',
        status: 'new',
        sourceIp: ip,
        userAgent,
      },
    })
  } catch (err) {
    // Never leak internal errors to the client
    if (process.env.NODE_ENV !== 'production') {
      console.error('[email-request] create failed', err)
    }
    return NextResponse.json({ ok: false, code: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
