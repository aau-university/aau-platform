import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { anyone } from '../anyone'

type AccessArgs = Parameters<Access>[0]

/**
 * Build a minimal Access args object with the given `req.user`. Cast through
 * `unknown` to satisfy the full PayloadRequest shape — we only exercise the
 * `req.user` path in these smoke tests.
 */
function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

/**
 * Smoke tests for the `anyone` template-pattern access function.
 *
 * `anyone` mirrors the official Payload template's `anyone` access function.
 * It always returns `true` regardless of the request. Use it as an explicit,
 * self-documenting alternative to `() => true`.
 */
describe('anyone (template-pattern access)', () => {
  it('returns true when there is no user', () => {
    expect(anyone(args(null))).toBe(true)
  })

  it('returns true when the user is authenticated', () => {
    expect(anyone(args({ id: '1' }))).toBe(true)
  })

  it('returns true even when req is empty', () => {
    expect(anyone({} as unknown as AccessArgs)).toBe(true)
  })
})
