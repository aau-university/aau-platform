import { describe, expect, it } from 'vitest'

import { extractClientIp, extractUserAgent } from '../request-ip'

function h(headers: Record<string, string>): Headers {
  return new Headers(headers)
}

describe('extractClientIp', () => {
  it('returns "unknown" when no IP headers are present', () => {
    expect(extractClientIp(h({}))).toBe('unknown')
  })

  it('uses x-forwarded-for leftmost only when no trusted-infra header is present', () => {
    expect(extractClientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
  })

  it('uses x-real-ip', () => {
    expect(extractClientIp(h({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('uses cf-connecting-ip', () => {
    expect(extractClientIp(h({ 'cf-connecting-ip': '8.8.8.8' }))).toBe('8.8.8.8')
  })

  it('prefers trusted-infra headers over a (spoofable) x-forwarded-for', () => {
    // Security: XFF is client-appendable, so a trusted header must win to
    // stop an attacker rotating XFF to defeat per-IP rate limiting.
    expect(
      extractClientIp(
        h({ 'cf-connecting-ip': '8.8.8.8', 'x-forwarded-for': '6.6.6.6, 7.7.7.7' }),
      ),
    ).toBe('8.8.8.8')
    expect(
      extractClientIp(h({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '6.6.6.6' })),
    ).toBe('9.9.9.9')
  })

  it('falls back to x-vercel-forwarded-for', () => {
    expect(
      extractClientIp(h({ 'x-vercel-forwarded-for': '4.4.4.4, 5.5.5.5' })),
    ).toBe('4.4.4.4')
  })

  it('does not throw on a blank x-forwarded-for', () => {
    // Only the unreliable header is present — we fall through to "unknown".
    expect(extractClientIp(h({ 'x-forwarded-for': ' , ' }))).toBe('unknown')
  })
})

describe('extractUserAgent', () => {
  it('returns empty string when missing', () => {
    expect(extractUserAgent(h({}))).toBe('')
  })

  it('caps very long values at 500 chars', () => {
    const ua = 'A'.repeat(2000)
    expect(extractUserAgent(h({ 'user-agent': ua })).length).toBe(500)
  })

  it('returns the raw value when reasonable', () => {
    expect(
      extractUserAgent(h({ 'user-agent': 'Mozilla/5.0 (X11; Linux)' })),
    ).toBe('Mozilla/5.0 (X11; Linux)')
  })
})
