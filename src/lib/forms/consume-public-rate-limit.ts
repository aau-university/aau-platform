import { NextResponse } from 'next/server'

import { isRateLimiterUnavailable, publicFormRateLimiter } from '@/lib/rate-limit'

/**
 * Shared rate-limit step for the public form routes.
 *
 * Returns a `NextResponse` when the request must be rejected, or `null` when
 * the caller should continue.
 *
 * Two distinct failure modes are separated deliberately:
 *
 * - **429** — the visitor genuinely exceeded the window.
 * - **503** — the limiter cannot run: the deployment has no `REDIS_URL`, or
 *   Redis is unreachable/slow. This used to escape as an unhandled throw,
 *   which Next.js turned into a bare `500` with an EMPTY body: the client
 *   could not tell a misconfigured server from a crashed one, and monitoring
 *   saw a generic server error. A typed 503 with `Retry-After` states the
 *   truth — the service is temporarily unavailable — without weakening the
 *   fail-closed stance that keeps forms from being spammed when shared
 *   rate-limit state is unavailable.
 *
 * Detection goes through `isRateLimiterUnavailable` rather than a bare
 * `instanceof`, so a duplicate module instance cannot silently downgrade a
 * known outage back into a bare 500.
 */
export async function consumePublicFormRateLimit(key: string): Promise<NextResponse | null> {
  let result
  try {
    result = await publicFormRateLimiter.consume(key)
  } catch (error) {
    if (isRateLimiterUnavailable(error)) {
      // One line per rejected submission so an outage is visible in the logs
      // rather than only as a 503 the visitor sees.
      console.error('[rate-limit] limiter unavailable; rejecting submission with 503', {
        cause: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        { ok: false, code: 'rate_limiter_unavailable' },
        { status: 503, headers: { 'Retry-After': '60' } },
      )
    }
    throw error
  }

  if (!result.allowed) {
    return NextResponse.json(
      { ok: false, code: 'rate_limited', retryAfter: result.retryAfter },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
    )
  }

  return null
}
