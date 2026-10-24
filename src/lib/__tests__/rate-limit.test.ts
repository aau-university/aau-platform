import { describe, expect, it } from 'vitest'

import { InMemoryRateLimiter } from '../rate-limit'

describe('InMemoryRateLimiter', () => {
  it('rejects invalid construction', () => {
    expect(() => new InMemoryRateLimiter({ windowMs: 0, max: 5 })).toThrow()
    expect(() => new InMemoryRateLimiter({ windowMs: 1000, max: 0 })).toThrow()
  })

  it('allows up to max requests in the window, then blocks', () => {
    const now = 1_000_000
    const limiter = new InMemoryRateLimiter({
      windowMs: 60_000,
      max: 3,
      now: () => now,
    })

    expect(limiter.consume('ip-1').allowed).toBe(true)
    expect(limiter.consume('ip-1').allowed).toBe(true)
    expect(limiter.consume('ip-1').allowed).toBe(true)

    const denied = limiter.consume('ip-1')
    expect(denied.allowed).toBe(false)
    expect(denied.remaining).toBe(0)
    expect(denied.retryAfter).toBeGreaterThan(0)
  })

  it('refills after the window elapses', () => {
    let now = 1_000_000
    const limiter = new InMemoryRateLimiter({
      windowMs: 10_000,
      max: 1,
      now: () => now,
    })
    expect(limiter.consume('ip-2').allowed).toBe(true)
    expect(limiter.consume('ip-2').allowed).toBe(false)
    now += 11_000 // jump past the window
    expect(limiter.consume('ip-2').allowed).toBe(true)
  })

  it('isolates buckets by key', () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, max: 1 })
    expect(limiter.consume('a').allowed).toBe(true)
    expect(limiter.consume('b').allowed).toBe(true)
    expect(limiter.consume('a').allowed).toBe(false)
    expect(limiter.consume('b').allowed).toBe(false)
  })

  it('reset() clears one key or all', () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60_000, max: 1 })
    limiter.consume('a')
    limiter.reset('a')
    expect(limiter.consume('a').allowed).toBe(true)

    limiter.consume('a')
    limiter.consume('b')
    limiter.reset()
    expect(limiter.consume('a').allowed).toBe(true)
    expect(limiter.consume('b').allowed).toBe(true)
  })
})
