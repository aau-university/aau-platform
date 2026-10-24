/**
 * POST /api/public/contact — public contact-form submission handler.
 *
 * Pipeline:
 *   1. Rate limit by client IP (Redis-backed in production).
 *   2. Validate body with Zod (contactSchema). Honeypot must be empty.
 *   3. Resolve Payload via Local API and `payload.create` with
 *      overrideAccess:true (the collection itself denies anonymous create —
 *      this route is the sanctioned entry point).
 *   4. Persist client IP and user-agent metadata as part of the document
 *      to assist later abuse review.
 *   5. Return a small JSON response. Never leak internal errors.
 *
 * Locale support: the request may include an `accept-language` header. The
 * response messages picked here are intentionally short and language-
 * neutral — the client renders the full bilingual user-facing copy from
 * the dictionary.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { contactSchema } from '@/lib/forms/contact-schema'
import { consumePublicFormRateLimit } from '@/lib/forms/consume-public-rate-limit'
import { extractClientIp, extractUserAgent } from '@/lib/request-ip'

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request.headers)
  const userAgent = extractUserAgent(request.headers)

  // 1. Rate limit
  // Returns 429 when the visitor is over the window, 503 when the
  // limiter itself is unavailable (production without REDIS_URL).
  const limited = await consumePublicFormRateLimit(`contact:${ip}`)
  if (limited) return limited

  // 2. Parse + validate
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: 'validation_failed' }, { status: 400 })
  }

  const { name, email, phone, subject, message } = parsed.data

  // 3. Persist
  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'contact-messages',
      overrideAccess: true,
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'new',
        // Internal notes capture the source metadata for moderator review.
        // (Field already exists on the collection; we co-opt it for the IP /
        // UA trail rather than introducing a new field in this stabilization
        // pass.)
        notes: `submitted-by-ip=${ip}\nuser-agent=${userAgent}`,
      },
    })
  } catch (err) {
    // Never leak the underlying Payload/Postgres error to the client.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[contact] create failed', err)
    }
    return NextResponse.json({ ok: false, code: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
