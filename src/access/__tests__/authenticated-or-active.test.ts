import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { authenticatedOrActive } from '../authenticated-or-active'

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
 * Smoke tests for the `authenticatedOrActive` template-pattern access
 * function.
 *
 * `authenticatedOrActive` is the parity variant of `authenticatedOrPublished`
 * for collections that still use the legacy `isPublished` boolean field rather
 * than the Payload-native `_status` draft/publish workflow. It returns `true`
 * for authenticated users, and `{ isPublished: { equals: true } }` for
 * anonymous users.
 */
describe('authenticatedOrActive (template-pattern access, legacy field)', () => {
  it('returns true when req.user is present', () => {
    expect(authenticatedOrActive(args({ id: '1' }))).toBe(true)
  })

  it('returns a Where constraint for anonymous users', () => {
    expect(authenticatedOrActive(args(null))).toEqual({
      isPublished: { equals: true },
    })
  })

  it('returns a Where constraint when req.user is undefined', () => {
    expect(authenticatedOrActive({ req: {} } as unknown as AccessArgs)).toEqual({
      isPublished: { equals: true },
    })
  })
})
