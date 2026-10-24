import { describe, expect, it } from 'vitest'

import { safeEqual } from '../crypto/safeEqual'

/**
 * Tests for the constant-time string comparison helper (Issue #8).
 *
 * The function exists to defeat timing attacks on secret comparisons
 * (`/next/preview`, `/next/seed`). These tests assert the public contract:
 *   - equal strings → true
 *   - different strings of the same length → false
 *   - different lengths → false (no throw)
 *   - empty strings → true (both empty)
 *   - one empty, one not → false
 *
 * We do NOT assert constant-time behavior here — that's a property of the
 * underlying `crypto.timingSafeEqual` and would require statistical
 * measurement across millions of runs. The unit-level guarantee is that
 * the function returns the correct boolean and never throws for any
 * string inputs.
 */
describe('safeEqual (constant-time string comparison)', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('secret', 'secret')).toBe(true)
    expect(safeEqual('a', 'a')).toBe(true)
    expect(safeEqual('', '')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(safeEqual('secret', 'secrtu')).toBe(false)
    expect(safeEqual('secret', 'SECRET')).toBe(false)
    expect(safeEqual('abc', 'abd')).toBe(false)
  })

  it('returns false (no throw) when lengths differ', () => {
    expect(() => safeEqual('short', 'longer-string')).not.toThrow()
    expect(safeEqual('short', 'longer-string')).toBe(false)
    expect(safeEqual('longer-string', 'short')).toBe(false)
  })

  it('handles extreme source-length differences in both argument orders', () => {
    const long = 'a'.repeat(100_000)
    expect(() => safeEqual('x', long)).not.toThrow()
    expect(safeEqual('x', long)).toBe(false)
    expect(safeEqual(long, 'x')).toBe(false)
  })

  it('returns false when one input is empty and the other is not', () => {
    expect(safeEqual('', 'non-empty')).toBe(false)
    expect(safeEqual('non-empty', '')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })

  it('handles unicode characters', () => {
    expect(safeEqual('سر', 'سر')).toBe(true)
    expect(safeEqual('سر', 'ستر')).toBe(false)
    expect(safeEqual('🌟', '🌟')).toBe(true)
    expect(safeEqual('🌟', '⭐')).toBe(false)
  })

  it('compares an injective UTF-16 representation including unpaired surrogates', () => {
    expect(safeEqual('a\0b', 'a\0b')).toBe(true)
    expect(safeEqual('a\0b', 'ab')).toBe(false)
    expect(safeEqual('\ud800', '\ud800')).toBe(true)
    expect(safeEqual('\ud800', '\ud801')).toBe(false)
    expect(safeEqual('\udc00', '\udc01')).toBe(false)
  })

  it('handles long secrets (>1KB) without throw', () => {
    const long = 'a'.repeat(2000)
    const long2 = 'a'.repeat(2000)
    const longDiff = 'b' + 'a'.repeat(1999)
    expect(safeEqual(long, long2)).toBe(true)
    expect(safeEqual(long, longDiff)).toBe(false)
  })

  it('returns false for prefix matches (does not short-circuit)', () => {
    // A naive `===` would also return false here; this guards against a
    // regression where someone might rewrite the helper to use startsWith.
    expect(safeEqual('secret-prefix-shared', 'secret-prefix-other')).toBe(false)
  })
})
