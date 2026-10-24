import { describe, expect, it } from 'vitest'

import {
  canAccessAdmin,
  canManageUserRole,
  getUserPermissions,
  getUserRoleLevel,
  getUserRoleSlug,
  hasPermission,
  hasRoleLevelAtLeast,
  isSuperAdmin,
} from '..'

describe('canManageUserRole', () => {
  // Degenerate: unauthenticated user
  it('returns false when current user has no role', () => {
    expect(canManageUserRole(null, 'student')).toBe(false)
    expect(canManageUserRole({}, 'student')).toBe(false)
  })

  // Exception: self-escalation above own level
  it('denies admin from assigning super_admin role', () => {
    const admin = { role: { slug: 'admin' } }
    expect(canManageUserRole(admin, 'super_admin')).toBe(false)
  })

  it('denies content_manager from assigning admin role', () => {
    const cm = { role: { slug: 'content_manager' } }
    expect(canManageUserRole(cm, 'admin')).toBe(false)
  })

  it('denies coordinator from assigning content_manager role', () => {
    const coord = { role: { slug: 'coordinator' } }
    expect(canManageUserRole(coord, 'content_manager')).toBe(false)
  })

  it('denies student from assigning any role above themselves', () => {
    const student = { role: { slug: 'student' } }
    expect(canManageUserRole(student, 'coordinator')).toBe(false)
    expect(canManageUserRole(student, 'admin')).toBe(false)
  })

  // Happy path: allowed assignments
  it('allows admin to assign coordinator role (below their level)', () => {
    const admin = { role: { slug: 'admin' } }
    expect(canManageUserRole(admin, 'coordinator')).toBe(true)
  })

  it('allows admin to assign content_manager role', () => {
    const admin = { role: { slug: 'admin' } }
    expect(canManageUserRole(admin, 'content_manager')).toBe(true)
  })

  it('allows super_admin to assign any role including super_admin', () => {
    const sa = { role: { slug: 'super_admin' } }
    expect(canManageUserRole(sa, 'super_admin')).toBe(true)
    expect(canManageUserRole(sa, 'admin')).toBe(true)
    expect(canManageUserRole(sa, 'student')).toBe(true)
  })

  // Same-level: admin cannot assign another admin
  it('denies admin from assigning same-level admin role', () => {
    const admin = { role: { slug: 'admin' } }
    expect(canManageUserRole(admin, 'admin')).toBe(false)
  })

  // systemRole fallback
  it('falls back to systemRole field when role is not an object', () => {
    const user = { systemRole: 'admin' }
    expect(canManageUserRole(user, 'coordinator')).toBe(true)
    expect(canManageUserRole(user, 'super_admin')).toBe(false)
  })
})

describe('canAccessAdmin (legacy compatibility — see canAccessAdmin.test.ts for the full contract)', () => {
  // The hardened contract (stabilization pass) requires:
  //   - isActive on the user
  //   - role.isActive
  //   - role.canAccessPayloadAdmin === true (when role is populated)
  // OR — when role is not populated — uses roleCanAccessPayloadAdmin snapshot.
  // Legacy users without a role relationship fall back to systemRole level >= 2.
  //
  // The exhaustive test suite is in `canAccessAdmin.test.ts`. These few
  // tests preserve the old denial expectations.

  it('returns false for null/empty user', () => {
    expect(canAccessAdmin(null)).toBe(false)
    expect(canAccessAdmin({})).toBe(false)
  })

  it('denies student access to admin (role populated, no canAccessPayloadAdmin flag)', () => {
    expect(canAccessAdmin({ isActive: true, role: { slug: 'student' } })).toBe(false)
  })

  it('denies doctor access to admin (role populated, no canAccessPayloadAdmin flag)', () => {
    expect(canAccessAdmin({ isActive: true, role: { slug: 'doctor' } })).toBe(false)
  })

  it('denies systemRole-only users — no capability flag means no admin UI (fail closed)', () => {
    expect(canAccessAdmin({ isActive: true, systemRole: 'coordinator' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'content_manager' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'admin' })).toBe(false)
    expect(canAccessAdmin({ isActive: true, systemRole: 'super_admin' })).toBe(false)
  })

  it('allows when role explicitly grants admin access', () => {
    const role = { slug: 'admin', canAccessPayloadAdmin: true, isActive: true }
    expect(canAccessAdmin({ isActive: true, role })).toBe(true)
  })

  it('uses roleCanAccessPayloadAdmin when role is an unpopulated relationship ID', () => {
    expect(
      canAccessAdmin({ isActive: true, role: 4, roleIsActive: true, roleCanAccessPayloadAdmin: true }),
    ).toBe(true)
  })
})

describe('hasRoleLevelAtLeast', () => {
  it('returns false for unknown role', () => {
    expect(hasRoleLevelAtLeast({ role: { slug: 'unknown_role' } }, 1)).toBe(false)
  })

  it('returns false for null user', () => {
    expect(hasRoleLevelAtLeast(null, 1)).toBe(false)
  })

  it('doctor (level 1) meets level 1 threshold', () => {
    expect(hasRoleLevelAtLeast({ isActive: true, role: { slug: 'doctor', isActive: true } }, 1)).toBe(true)
  })

  it('coordinator (level 2) does not meet level 3', () => {
    expect(hasRoleLevelAtLeast({ isActive: true, role: { slug: 'coordinator', isActive: true } }, 3)).toBe(false)
  })

  it('reads level directly from roleLevel virtual field (JWT)', () => {
    expect(hasRoleLevelAtLeast({ isActive: true, roleIsActive: true, roleLevel: 3 }, 3)).toBe(true)
    expect(hasRoleLevelAtLeast({ isActive: true, roleIsActive: true, roleLevel: 3 }, 4)).toBe(false)
  })

  it('denies inactive users even when their role level is high', () => {
    expect(hasRoleLevelAtLeast({ isActive: false, roleLevel: 5 }, 1)).toBe(false)
  })

  it('denies users with an inactive populated role', () => {
    expect(
      hasRoleLevelAtLeast(
        { isActive: true, role: { slug: 'admin', level: 4, isActive: false } },
        4,
      ),
    ).toBe(false)
  })

  it('denies users with an inactive role snapshot', () => {
    expect(hasRoleLevelAtLeast({ roleLevel: 4, roleIsActive: false }, 4)).toBe(false)
  })

  it('treats a missing roleIsActive snapshot as INACTIVE (fail closed)', () => {
    // An unknown role state never grants access — the snapshot is
    // rewritten on every save, so legitimate users always carry it.
    expect(hasRoleLevelAtLeast({ isActive: true, role: 4, roleLevel: 4 }, 4)).toBe(false)
  })

  it('prefers a freshly-populated role.level over a stale roleLevel snapshot (demotion)', () => {
    // A super_admin (level 4) demoted to student (level 0) whose snapshot
    // hasn't been re-synced yet must be judged by the fresh role object,
    // not the stale JWT-carried roleLevel.
    expect(
      getUserRoleLevel({ roleLevel: 4, role: { slug: 'student', level: 0, isActive: true } }),
    ).toBe(0)
    expect(
      hasRoleLevelAtLeast(
        { roleLevel: 4, role: { slug: 'student', level: 0, isActive: true } },
        4,
      ),
    ).toBe(false)
  })
})

describe('isSuperAdmin', () => {
  it('requires an active user', () => {
    expect(isSuperAdmin({ isActive: false, roleSlug: 'super_admin' })).toBe(false)
  })
})

describe('getUserRoleSlug', () => {
  it('returns undefined for null input', () => {
    expect(getUserRoleSlug(null)).toBeUndefined()
    expect(getUserRoleSlug(undefined)).toBeUndefined()
  })

  it('returns slug from populated role object', () => {
    expect(getUserRoleSlug({ role: { id: 1, slug: 'admin' } })).toBe('admin')
  })

  it('returns string role directly when role is a plain string', () => {
    expect(getUserRoleSlug({ role: 'coordinator' })).toBe('coordinator')
  })

  it('falls back to systemRole when role is absent', () => {
    expect(getUserRoleSlug({ systemRole: 'content_manager' })).toBe('content_manager')
  })

  it('returns undefined when neither role nor systemRole present', () => {
    expect(getUserRoleSlug({ email: 'a@b.com' })).toBeUndefined()
  })

  it('returns slug from roleSlug virtual field (JWT)', () => {
    expect(getUserRoleSlug({ roleSlug: 'marketing_manager' })).toBe('marketing_manager')
  })

  it('prefers a freshly-populated role object over a stale roleSlug snapshot', () => {
    // Regression test: a demoted user whose `role` relationship was just
    // re-populated (depth>=1) must not be answered from a stale
    // `saveToJWT` snapshot that hasn't been re-synced yet by
    // `syncUsersOnRoleChange`.
    expect(
      getUserRoleSlug({ roleSlug: 'super_admin', role: { id: 1, slug: 'student' } }),
    ).toBe('student')
  })
})

describe('hasPermission', () => {
  it('returns true if user has the specific permission in rolePermissions (JWT)', () => {
    expect(hasPermission({ isActive: true, roleIsActive: true, rolePermissions: ['edit_news'] }, 'edit_news')).toBe(true)
  })

  it('returns false if user does not have the permission', () => {
    expect(hasPermission({ rolePermissions: ['edit_news'] }, 'delete_news')).toBe(false)
  })

  it('returns true for super_admin regardless of rolePermissions', () => {
    expect(hasPermission({ isActive: true, roleIsActive: true, systemRole: 'super_admin', rolePermissions: [] }, 'anything')).toBe(true)
  })

  it('does not grant super_admin bypass to inactive users', () => {
    expect(hasPermission({ isActive: false, roleSlug: 'super_admin' }, 'anything')).toBe(false)
  })

  it('does not grant explicit permissions to inactive users', () => {
    expect(
      hasPermission({ isActive: false, rolePermissions: ['anything'] }, 'anything'),
    ).toBe(false)
  })

  it('does not grant explicit permissions when role snapshot is inactive', () => {
    expect(
      hasPermission({ roleIsActive: false, rolePermissions: ['anything'] }, 'anything'),
    ).toBe(false)
  })

  it('prefers a freshly-populated role.permissions over a stale rolePermissions snapshot', () => {
    // A user whose permissions were just revoked at the role level, but
    // whose stale JWT snapshot still lists the old permission, must be
    // judged by the fresh role object.
    expect(
      getUserPermissions({
        rolePermissions: ['delete_users'],
        role: { permissions: ['edit_news'], isActive: true },
      }),
    ).toEqual(['edit_news'])
    expect(
      hasPermission(
        {
          rolePermissions: ['delete_users'],
          role: { permissions: ['edit_news'], isActive: true },
        },
        'delete_users',
      ),
    ).toBe(false)
  })

  it('falls through to the rolePermissions snapshot when role is populated but carries no permissions array', () => {
    // A role object without a `permissions` array (an ID-only relationship
    // `{ id: 3 }`, or a role whose `permissions` field was stripped by
    // field-level read access) must NOT zero out permissions — it must fall
    // through to the snapshot, mirroring getUserRoleLevel's fallthrough.
    expect(getUserPermissions({ role: { id: 3 }, rolePermissions: ['edit_news'] })).toEqual([
      'edit_news',
    ])
    expect(hasPermission({ isActive: true, roleIsActive: true, role: { id: 3 }, rolePermissions: ['edit_news'] }, 'edit_news')).toBe(
      true,
    )
  })
})
