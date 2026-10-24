import { beforeEach, describe, expect, it, vi } from 'vitest'

const consume = vi.fn()

vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit')
  return {
    ...actual,
    publicFormRateLimiter: { consume, reset: vi.fn() },
  }
})

describe('consumePublicFormRateLimit', () => {
  beforeEach(() => {
    consume.mockReset()
  })

  it('returns null so the caller proceeds when the request is allowed', async () => {
    consume.mockResolvedValue({ allowed: true, remaining: 4, retryAfter: 0 })
    const { consumePublicFormRateLimit } = await import('../consume-public-rate-limit')
    await expect(consumePublicFormRateLimit('contact:1.2.3.4')).resolves.toBeNull()
  })

  it('returns 429 with Retry-After when the visitor is over the window', async () => {
    consume.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 42 })
    const { consumePublicFormRateLimit } = await import('../consume-public-rate-limit')
    const res = await consumePublicFormRateLimit('contact:1.2.3.4')

    expect(res).not.toBeNull()
    expect(res!.status).toBe(429)
    expect(res!.headers.get('Retry-After')).toBe('42')
    await expect(res!.json()).resolves.toEqual({
      ok: false,
      code: 'rate_limited',
      retryAfter: 42,
    })
  })

  // Regression: production without REDIS_URL used to throw out of the route,
  // which Next.js turned into a bare 500 with an EMPTY body on contact,
  // join-request and email-request alike — indistinguishable from a crash.
  it('converts an unavailable limiter into a typed 503 instead of an unhandled 500', async () => {
    const { RateLimiterUnavailableError } = await import('@/lib/rate-limit')
    consume.mockRejectedValue(new RateLimiterUnavailableError())
    const { consumePublicFormRateLimit } = await import('../consume-public-rate-limit')
    const res = await consumePublicFormRateLimit('contact:1.2.3.4')

    expect(res).not.toBeNull()
    expect(res!.status).toBe(503)
    expect(res!.headers.get('Retry-After')).toBe('60')
    await expect(res!.json()).resolves.toEqual({
      ok: false,
      code: 'rate_limiter_unavailable',
    })
  })

  it('still propagates unexpected errors so real bugs are not masked', async () => {
    consume.mockRejectedValue(new Error('redis connection reset'))
    const { consumePublicFormRateLimit } = await import('../consume-public-rate-limit')
    await expect(consumePublicFormRateLimit('contact:1.2.3.4')).rejects.toThrow(
      'redis connection reset',
    )
  })
})
