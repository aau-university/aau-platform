import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { authenticated } from '../authenticated'

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
 * Smoke tests for the `authenticated` template-pattern access function.
 *
 * `authenticated` mirrors the official Payload template's `authenticated`
 * access function. It returns `true` whenever `req.user` is present and
 * `false` otherwise. No role hierarchy is enforced.
 */
describe('authenticated (template-pattern access)', () => {
  it('denies when req.user is null', () => {
    expect(authenticated(args(null))).toBe(false)
  })

  it('denies when req.user is undefined', () => {
    expect(authenticated({ req: {} } as unknown as AccessArgs)).toBe(false)
  })

  it('allows when req.user is present', () => {
    expect(authenticated(args({ id: '1' }))).toBe(true)
  })
})
