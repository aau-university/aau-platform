import type { Access, FilterOptionsProps } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  assignableRolesFilter,
  createManageableUsers,
  deleteManageableUsers,
  privilegedUserFieldAccess,
  privilegedUserFieldRead,
  readManageableUsers,
  updateManageableUsers,
} from '../manageable-users'

type AccessArgs = Parameters<Access>[0]

function args(user: unknown, id?: number | string): AccessArgs {
  return { req: { user }, id } as unknown as AccessArgs
}

const superAdmin = { id: 1, isActive: true, roleIsActive: true, roleSlug: 'super_admin', roleLevel: 5 }
const admin = { id: 2, isActive: true, roleIsActive: true, roleSlug: 'admin', roleLevel: 4 }
const manager = { id: 3, isActive: true, roleIsActive: true, roleSlug: 'content_manager', roleLevel: 3 }
const coordinator = { id: 4, isActive: true, roleIsActive: true, roleSlug: 'coordinator', roleLevel: 2 }
const student = { id: 5, isActive: true, roleIsActive: true, roleSlug: 'student', roleLevel: 1 }

// A content manager may act on themselves or on any strictly lower level.
const managerScope = { or: [{ id: { equals: 3 } }, { roleLevel: { less_than: 3 } }] }

describe('readManageableUsers', () => {
  it('lets admin+ read every user', () => {
    expect(readManageableUsers(args(admin))).toBe(true)
    expect(readManageableUsers(args(superAdmin))).toBe(true)
  })

  it('limits a content manager to themselves plus lower-level users', () => {
    expect(readManageableUsers(args(manager))).toEqual(managerScope)
  })

  it('limits coordinators and students to their own record', () => {
    expect(readManageableUsers(args(coordinator))).toEqual({ id: { equals: 4 } })
    expect(readManageableUsers(args(student))).toEqual({ id: { equals: 5 } })
  })

  it('denies anonymous', () => {
    expect(readManageableUsers(args(null))).toBe(false)
  })
})

describe('updateManageableUsers', () => {
  it('lets admin+ update anyone', () => {
    expect(updateManageableUsers(args(admin, 99))).toBe(true)
  })

  it('scopes a content manager to self + lower levels', () => {
    expect(updateManageableUsers(args(manager, 99))).toEqual(managerScope)
  })

  it('lets a coordinator update only their own record', () => {
    expect(updateManageableUsers(args(coordinator, 4))).toBe(true)
    expect(updateManageableUsers(args(coordinator, 99))).toBe(false)
  })
})

describe('createManageableUsers', () => {
  it('allows content manager and above', () => {
    expect(createManageableUsers(args(manager))).toBe(true)
    expect(createManageableUsers(args(admin))).toBe(true)
    expect(createManageableUsers(args(superAdmin))).toBe(true)
  })

  it('denies coordinators, students and anonymous', () => {
    expect(createManageableUsers(args(coordinator))).toBe(false)
    expect(createManageableUsers(args(student))).toBe(false)
    expect(createManageableUsers(args(null))).toBe(false)
  })

  it('denies an inactive content manager', () => {
    expect(createManageableUsers(args({ ...manager, isActive: false }))).toBe(false)
  })
})

describe('deleteManageableUsers', () => {
  it('lets a super admin delete anyone', () => {
    expect(deleteManageableUsers(args(superAdmin))).toBe(true)
  })

  it('restricts admin and content manager to strictly lower levels', () => {
    expect(deleteManageableUsers(args(admin))).toEqual({ roleLevel: { less_than: 4 } })
    expect(deleteManageableUsers(args(manager))).toEqual({ roleLevel: { less_than: 3 } })
  })

  it('denies coordinators and anonymous', () => {
    expect(deleteManageableUsers(args(coordinator))).toBe(false)
    expect(deleteManageableUsers(args(null))).toBe(false)
  })
})

describe('privilegedUserFieldAccess', () => {
  it('opens role/collegeScope/isActive to content manager and above', () => {
    expect(privilegedUserFieldAccess({ req: { user: manager } } as never)).toBe(true)
    expect(privilegedUserFieldAccess({ req: { user: admin } } as never)).toBe(true)
  })

  it('keeps them closed to coordinators and below', () => {
    expect(privilegedUserFieldAccess({ req: { user: coordinator } } as never)).toBe(false)
    expect(privilegedUserFieldAccess({ req: { user: null } } as never)).toBe(false)
  })
})

describe('privilegedUserFieldRead', () => {
  // A manager who may CHANGE the role must be able to SEE it, or the Users
  // list column blanks and the REQUIRED role picker renders empty.
  it('matches the write guard so managed rows show their role', () => {
    expect(privilegedUserFieldRead({ req: { user: manager }, id: 99 } as never)).toBe(true)
    expect(privilegedUserFieldRead({ req: { user: admin }, id: 99 } as never)).toBe(true)
  })

  it('still lets any user read their own', () => {
    expect(privilegedUserFieldRead({ req: { user: coordinator }, id: 4 } as never)).toBe(true)
    expect(privilegedUserFieldRead({ req: { user: student }, id: 5 } as never)).toBe(true)
  })

  it('hides other users’ privilege fields from coordinators and below', () => {
    expect(privilegedUserFieldRead({ req: { user: coordinator }, id: 99 } as never)).toBe(false)
    expect(privilegedUserFieldRead({ req: { user: null }, id: 99 } as never)).toBe(false)
  })
})

describe('assignableRolesFilter', () => {
  // No `id` → create path: only the level rule applies.
  const filterOnCreate = (user: unknown) =>
    assignableRolesFilter({ user } as unknown as FilterOptionsProps)

  // With `id` → update path: the target's existing role stays assignable.
  const filterOnUpdate = (user: unknown, existingRoleId: unknown) =>
    assignableRolesFilter({
      user,
      id: 42,
      req: {
        payload: { findByID: async () => ({ role: existingRoleId }) },
      },
    } as unknown as FilterOptionsProps)

  it('lets a super admin assign any role', async () => {
    await expect(filterOnCreate(superAdmin)).resolves.toBe(true)
  })

  it('caps a content manager to roles below level 3 (coordinator and below)', async () => {
    await expect(filterOnCreate(manager)).resolves.toEqual({ level: { less_than: 3 } })
  })

  it('caps an admin to roles below level 4', async () => {
    await expect(filterOnCreate(admin)).resolves.toEqual({ level: { less_than: 4 } })
  })

  it('denies users with a role that resolves to no level', async () => {
    await expect(filterOnCreate({ id: 9 })).resolves.toBe(false)
  })

  // Regression: `filterOptions` validation ignores `overrideAccess`, and a
  // `false` return marks EVERY submitted value invalid. Returning `false` for
  // an absent user made `pnpm seed`, `registerFirstUser` and the
  // `syncUsersOnRoleChange` re-sync fail with "the following field is
  // invalid: Role" — a fresh database could not be created at all.
  it('does NOT reject internal overrideAccess operations that carry no user', async () => {
    await expect(filterOnCreate(null)).resolves.toBe(true)
    await expect(filterOnCreate(undefined)).resolves.toBe(true)
  })

  it('never offers a content manager their own tier or above on create', async () => {
    const result = (await filterOnCreate(manager)) as { level: { less_than: number } }
    // content_manager = 3, admin = 4, super_admin = 5 are all excluded.
    expect(result.level.less_than).toBe(3)
  })

  // Regression: Payload back-fills `role` on every update, so an ordinary
  // profile edit re-submits the user's existing role. Without keeping that
  // value assignable, nobody could edit their own profile and an admin could
  // not edit another admin.
  it('keeps the target user’s existing role assignable on update', async () => {
    await expect(filterOnUpdate(manager, 7)).resolves.toEqual({
      or: [{ level: { less_than: 3 } }, { id: { equals: 7 } }],
    })
  })

  it('accepts a populated relationship object for the existing role', async () => {
    await expect(filterOnUpdate(admin, { id: 4 })).resolves.toEqual({
      or: [{ level: { less_than: 4 } }, { id: { equals: 4 } }],
    })
  })

  it('falls back to the level rule when the target cannot be read', async () => {
    const result = await assignableRolesFilter({
      user: manager,
      id: 42,
      req: { payload: { findByID: async () => { throw new Error('gone') } } },
    } as unknown as FilterOptionsProps)
    expect(result).toEqual({ level: { less_than: 3 } })
  })

  it('still blocks assigning a NEW role at or above the actor on update', async () => {
    // The escape hatch is pinned to one specific role id, so any other
    // at-or-above role remains excluded by the level clause.
    const result = (await filterOnUpdate(manager, 7)) as { or: Array<Record<string, unknown>> }
    expect(result.or).toHaveLength(2)
    expect(result.or[1]).toEqual({ id: { equals: 7 } })
  })
})
