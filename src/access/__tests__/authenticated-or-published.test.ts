import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { authenticatedOrPublished } from '../authenticated-or-published'

type AccessArgs = Parameters<Access>[0]

const PUBLISHED_WHERE = { _status: { equals: 'published' } }

/**
 * Build a minimal Access args object with the given `req.user`. Cast through
 * `unknown` to satisfy the full PayloadRequest shape — we only exercise the
 * `req.user` path in these tests.
 */
function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

/**
 * Tests for the `authenticatedOrPublished` template-pattern access function.
 *
 * Security contract (Issue #35):
 *   - Anonymous users see only `_status: 'published'`.
 *   - Authenticated students and doctors (role level 1) see only
 *     `_status: 'published'` — they must NOT be able to read drafts via
 *     `GET /api/<collection>?where[_status][equals]=draft`.
 *   - Authenticated coordinators still see only published content in these
 *     unscoped collections.
 *   - Content Manager+ users (role level ≥ 3) see everything, including drafts.
 *
 * Role hierarchy (see `../role-levels.ts`):
 *   super_admin=5, admin=4, content_manager=3, coordinator=2,
 *   student=1, doctor=1.
 *
 * `hasRoleLevelAtLeast` resolves the level from any of `user.roleLevel`,
 * `user.role.level`, or the slug → ROLE_LEVELS fallback (via
 * `user.role.slug` / `user.roleSlug` / `user.systemRole`).
 */
describe('authenticatedOrPublished (template-pattern access)', () => {
  describe('anonymous / unauthenticated requests', () => {
    it('returns a Where constraint when req.user is null', () => {
      expect(authenticatedOrPublished(args(null))).toEqual(PUBLISHED_WHERE)
    })

    it('returns a Where constraint when req.user is undefined', () => {
      expect(authenticatedOrPublished({ req: {} } as unknown as AccessArgs)).toEqual(
        PUBLISHED_WHERE,
      )
    })
  })

  describe('authenticated users with role level < 3 (must NOT see drafts)', () => {
    it('student (via role.slug) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'student', isActive: true } }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('doctor (via role.slug) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'doctor', isActive: true } }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('student (via roleSlug JWT snapshot) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, roleSlug: 'student' }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('doctor (via roleSlug JWT snapshot) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, roleSlug: 'doctor' }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('student (via systemRole fallback) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, systemRole: 'student' }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('authenticated user with unknown role (level 0) → published-only (fail-secure)', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'unknown_role', isActive: true } }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('authenticated user with no role info at all → published-only (fail-secure)', () => {
      expect(authenticatedOrPublished(args({ id: 1, email: 'a@b.com' }))).toEqual(PUBLISHED_WHERE)
    })
  })

  describe('authenticated coordinators (must NOT see unscoped drafts)', () => {
    it('coordinator (level 2, via role.slug) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'coordinator', isActive: true } }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('coordinator (via roleSlug JWT snapshot) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, roleSlug: 'coordinator' }))).toEqual(
        PUBLISHED_WHERE,
      )
    })

    it('coordinator (via roleLevel JWT snapshot = 2) → published-only', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, roleLevel: 2 }))).toEqual(
        PUBLISHED_WHERE,
      )
    })
  })

  describe('authenticated users with role level ≥ 3 (may see drafts)', () => {
    it('content_manager (level 3, via role.slug) → true', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'content_manager', isActive: true } }))).toBe(
        true,
      )
    })

    it('admin (level 4, via role.slug) → true', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'admin', isActive: true } }))).toBe(true)
    })

    it('admin (via roleLevel JWT snapshot = 4) → true', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, roleLevel: 4 }))).toBe(true)
    })

    it('super_admin (level 5, via role.slug) → true', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, role: { slug: 'super_admin', isActive: true } }))).toBe(true)
    })

    it('super_admin (via systemRole fallback) → true', () => {
      expect(authenticatedOrPublished(args({ id: 1, isActive: true, roleIsActive: true, systemRole: 'super_admin' }))).toBe(true)
    })
  })

  describe('draft-visibility boundary', () => {
    it('coordinator (level 2) and content manager (level 3) return different values', () => {
      const coordinatorResult = authenticatedOrPublished(
        args({ id: 1, isActive: true, role: { slug: 'coordinator', isActive: true } }),
      )
      const contentManagerResult = authenticatedOrPublished(
        args({ id: 1, isActive: true, role: { slug: 'content_manager', isActive: true } }),
      )
      expect(coordinatorResult).not.toBe(contentManagerResult)
      expect(coordinatorResult).toEqual(PUBLISHED_WHERE)
      expect(contentManagerResult).toBe(true)
    })
  })
})
