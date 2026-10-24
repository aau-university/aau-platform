/**
 * Tests for `enforceLastSuperAdminOnDelete` + `enforceSystemRoleOnDelete`
 * (PR-016) — the cross-cutting `beforeDelete` hooks that prevent:
 *
 *   1. Deleting the last `super_admin` user (lockout prevention).
 *   2. Deleting a system role (`isSystemRole: true` OR `slug === 'super_admin'`).
 *
 * Three scenarios from the PR-016 spec:
 *   1. Throws when deleting the last super_admin.
 *   2. Succeeds when deleting a non-last super_admin.
 *   3. Throws when deleting a system role.
 *
 * The Payload Local API is mocked via a minimal `req.payload` stub —
 * `findByID` returns the user/role being deleted, `count` returns the
 * `total` for the super_admin user count.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  enforceLastSuperAdminOnDelete,
  enforceSystemRoleOnDelete,
} from '@/hooks/enforceLastSuperAdminOnDelete'

function runUsersHook(args: {
  id: string | number
  user?: Record<string, unknown> | null
  role?: { slug?: string; id?: string | number } | null
  /** isActive of the user BEING DELETED (defaults to active). */
  targetIsActive?: boolean
  /** Count of OTHER active super-admins the mocked `count` should report. */
  otherActiveSuperAdmins?: number
}): Promise<void> {
  // `findByID` returns the USER doc (with `role` populated to a Role object
  // because the hook calls with `depth: 1`). So we wrap `args.role` in
  // `{ role: ... }` to simulate the populated user shape.
  const findByID = vi.fn(async () =>
    args.role === null || args.role === undefined
      ? null
      : { role: args.role, isActive: args.targetIsActive ?? true },
  )
  // The hook now excludes the target from the count, so the mocked value
  // represents the number of OTHER active super-admins.
  const count = vi.fn(async () => ({ totalDocs: args.otherActiveSuperAdmins ?? 0 }))

  return (enforceLastSuperAdminOnDelete as unknown as (a: unknown) => Promise<void>)({
    id: args.id,
    req: { user: args.user ?? { id: 'u-admin' }, payload: { findByID, count } },
    collection: { slug: 'users' },
  })
}

function runRolesHook(args: {
  id: string | number
  role?: { slug?: string; isSystemRole?: boolean } | null
}): Promise<void> {
  const findByID = vi.fn(async () => args.role)
  const count = vi.fn(async () => ({ total: 0 }))

  return (enforceSystemRoleOnDelete as unknown as (a: unknown) => Promise<void>)({
    id: args.id,
    req: { user: { id: 'u-admin' }, payload: { findByID, count } },
    collection: { slug: 'roles' },
  })
}

describe('enforceLastSuperAdminOnDelete', () => {
  it('throws when deleting the last super_admin (no other active super_admin)', async () => {
    await expect(
      runUsersHook({
        id: 'u-super-1',
        role: { slug: 'super_admin', id: 'role-super' },
        otherActiveSuperAdmins: 0, // no other active super_admin remains
      }),
    ).rejects.toThrow(/Cannot delete the last super_admin user/i)
  })

  it('succeeds when deleting a non-last super_admin (others remain)', async () => {
    await expect(
      runUsersHook({
        id: 'u-super-2',
        role: { slug: 'super_admin', id: 'role-super' },
        otherActiveSuperAdmins: 2, // multiple other active super_admins remain
      }),
    ).resolves.toBeUndefined()
  })

  it('succeeds when deleting a non-super_admin user (no count needed)', async () => {
    await expect(
      runUsersHook({
        id: 'u-student',
        role: { slug: 'student', id: 'role-student' },
      }),
    ).resolves.toBeUndefined()
  })

  it('succeeds when the user has no role populated', async () => {
    await expect(
      runUsersHook({
        id: 'u-orphan',
        role: null,
      }),
    ).resolves.toBeUndefined()
  })

  it('throws when deleting the last ACTIVE super_admin even if an inactive super_admin also exists', async () => {
    // Regression test: an active super-admin is being deleted while a
    // deactivated super-admin also exists. Because the hook now counts only
    // *other active* super-admins (excluding the target and inactive rows),
    // there are zero others → the delete must be blocked to avoid a lockout.
    await expect(
      runUsersHook({
        id: 'u-super-active',
        role: { slug: 'super_admin', id: 'role-super' },
        targetIsActive: true,
        otherActiveSuperAdmins: 0, // the inactive one does not count
      }),
    ).rejects.toThrow(/Cannot delete the last super_admin user/i)
  })

  it('excludes the target from the active-super-admin count', async () => {
    // The `where` clause must exclude the user being deleted (id not_equals)
    // and filter to active super-admins, otherwise the target counts itself
    // and the "last super-admin" check is off by one.
    const count = vi.fn(async () => ({ totalDocs: 1 }))
    const findByID = vi.fn(async () => ({
      role: { slug: 'super_admin', id: 'role-super' },
      isActive: true,
    }))

    await (enforceLastSuperAdminOnDelete as unknown as (a: unknown) => Promise<void>)({
      id: 'u-super-x',
      req: { user: { id: 'u-admin' }, payload: { findByID, count } },
      collection: { slug: 'users' },
    })

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { isActive: { equals: true } },
            { id: { not_equals: 'u-super-x' } },
          ]),
        }),
      }),
    )
  })

  it('allows deleting an INACTIVE super_admin without counting (no lockout risk)', async () => {
    // Deleting a deactivated super-admin removes no active coverage, so the
    // hook must short-circuit before it ever calls `count`. A prior version
    // that always counted active supers would wrongly block this whenever
    // exactly one active super-admin remained.
    const count = vi.fn(async () => ({ totalDocs: 0 }))
    const findByID = vi.fn(async () => ({
      role: { slug: 'super_admin', id: 'role-super' },
      isActive: false,
    }))

    await expect(
      (enforceLastSuperAdminOnDelete as unknown as (a: unknown) => Promise<void>)({
        id: 'u-super-inactive',
        req: { user: { id: 'u-admin' }, payload: { findByID, count } },
        collection: { slug: 'users' },
      }),
    ).resolves.toBeUndefined()

    expect(count).not.toHaveBeenCalled()
  })
})

describe('enforceSystemRoleOnDelete (roles collection)', () => {
  it('throws when deleting a system role (isSystemRole === true)', async () => {
    await expect(
      runRolesHook({
        id: 'role-1',
        role: { slug: 'admin', isSystemRole: true },
      }),
    ).rejects.toThrow(/Cannot delete system role/i)
  })

  it('throws when deleting the super_admin role even if isSystemRole is missing (defensive slug check)', async () => {
    await expect(
      runRolesHook({
        id: 'role-super',
        role: { slug: 'super_admin' }, // isSystemRole not set
      }),
    ).rejects.toThrow(/Cannot delete system role/i)
  })

  it('succeeds when deleting a non-system role', async () => {
    await expect(
      runRolesHook({
        id: 'role-custom',
        role: { slug: 'custom_editor', isSystemRole: false },
      }),
    ).resolves.toBeUndefined()
  })
})

describe('req threading for transaction safety (Issue #36)', () => {
  it('threads req to payload.findByID in enforceLastSuperAdminOnDelete', async () => {
    const findByID = vi.fn(async () => ({ role: { slug: 'student', id: 'r-1' } }))
    const count = vi.fn(async () => ({ total: 5 }))
    const req = { user: { id: 'u-admin' }, payload: { findByID, count } }

    await (enforceLastSuperAdminOnDelete as unknown as (a: unknown) => Promise<void>)({
      id: 'u-1',
      req,
      collection: { slug: 'users' },
    })

    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('threads req to payload.count in enforceLastSuperAdminOnDelete', async () => {
    const findByID = vi.fn(async () => ({ role: { slug: 'super_admin', id: 'r-super' } }))
    const count = vi.fn(async () => ({ total: 3 }))
    const req = { user: { id: 'u-admin' }, payload: { findByID, count } }

    await (enforceLastSuperAdminOnDelete as unknown as (a: unknown) => Promise<void>)({
      id: 'u-super',
      req,
      collection: { slug: 'users' },
    })

    expect(count).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('threads req to payload.findByID in enforceSystemRoleOnDelete', async () => {
    const findByID = vi.fn(async () => ({ slug: 'custom', isSystemRole: false }))
    const count = vi.fn(async () => ({ total: 0 }))
    const req = { user: { id: 'u-admin' }, payload: { findByID, count } }

    await (enforceSystemRoleOnDelete as unknown as (a: unknown) => Promise<void>)({
      id: 'role-1',
      req,
      collection: { slug: 'roles' },
    })

    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })
})
