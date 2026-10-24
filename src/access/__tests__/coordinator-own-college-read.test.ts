import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { coordinatorOwnCollegeRead } from '../coordinator-own-college-read'

type AccessArgs = Parameters<Access>[0]

function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

const activeOnly = { _status: { equals: 'published' } }

describe('coordinatorOwnCollegeRead', () => {
  it('serves the public published colleges only', () => {
    // The public site calls Payload with no user, so this branch must stay
    // byte-identical to the previous behaviour.
    expect(coordinatorOwnCollegeRead(args(null))).toEqual(activeOnly)
    expect(coordinatorOwnCollegeRead(args(undefined))).toEqual(activeOnly)
  })

  it('gives content manager and above every college, including inactive', () => {
    expect(
      coordinatorOwnCollegeRead(args({ isActive: true, roleIsActive: true, roleLevel: 3 })),
    ).toBe(true)
    expect(
      coordinatorOwnCollegeRead(args({ isActive: true, roleIsActive: true, roleLevel: 5 })),
    ).toBe(true)
  })

  it('restricts a scoped coordinator to their own college document', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [{ key: 'colleges.manage' }],
          collegeScope: { id: 42 },
        }),
      ),
    ).toEqual({ id: { equals: 42 } })
  })

  it('accepts a bare relationship id for the scope', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          collegeScope: 7,
          rolePermissions: [{ key: 'colleges.manage' }],
        }),
      ),
    ).toEqual({ id: { equals: 7 } })
  })

  it('denies a coordinator with no collegeScope (fails closed)', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [{ key: 'colleges.manage' }],
        }),
      ),
    ).toBe(false)
  })

  it('denies own-college draft access immediately when colleges.manage is revoked', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          collegeScope: 42,
          rolePermissions: [],
        }),
      ),
    ).toBe(false)
  })

  it('treats a deactivated coordinator or role as public', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: false,
          roleIsActive: true,
          roleSlug: 'coordinator',
          collegeScope: { id: 42 },
        }),
      ),
    ).toEqual(activeOnly)
    expect(
      coordinatorOwnCollegeRead(
        args({
          isActive: true,
          roleIsActive: false,
          roleSlug: 'coordinator',
          collegeScope: { id: 42 },
        }),
      ),
    ).toEqual(activeOnly)
  })

  it('gives students and doctors the public constraint only', () => {
    expect(
      coordinatorOwnCollegeRead(
        args({ isActive: true, roleIsActive: true, roleSlug: 'student', roleLevel: 1 }),
      ),
    ).toEqual(activeOnly)
  })

  it('never leaks an unpublished college to a non-privileged reader', () => {
    const result = coordinatorOwnCollegeRead(
      args({ isActive: true, roleIsActive: true, roleSlug: 'doctor', roleLevel: 1 }),
    )
    expect(result).toEqual(activeOnly)
  })
})
