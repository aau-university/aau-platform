import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { coordinatorScopedRead } from '../coordinator-scoped-read'

type AccessArgs = Parameters<Access>[0]

function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

describe('coordinatorScopedRead', () => {
  const publishedWhere = { _status: { equals: 'published' } }
  const permission = 'programs.manage'
  const read = (options: { collegeField?: string; publishedRelations?: string[] } = {}) =>
    coordinatorScopedRead({ permission, ...options })

  it('returns published-only for anonymous visitors', () => {
    expect(read()(args(null))).toEqual(publishedWhere)
  })

  it('adds required parent publication constraints for public reads', () => {
    expect(read({ publishedRelations: ['college'] })(args(null))).toEqual({
      and: [publishedWhere, { 'college._status': { equals: 'published' } }],
    })
  })

  it('allows content_manager+ to read all docs', () => {
    expect(
      read()(args({ isActive: true, roleIsActive: true, roleLevel: 3 })),
    ).toBe(true)
  })

  it('returns public constraint for students and doctors', () => {
    expect(
      read()(args({ isActive: true, roleIsActive: true, roleSlug: 'student' })),
    ).toEqual(publishedWhere)
    expect(
      read()(args({ isActive: true, roleIsActive: true, roleSlug: 'doctor' })),
    ).toEqual(publishedWhere)
  })

  it('denies a coordinator without a collegeScope (fails closed)', () => {
    expect(
      read()(
        args({ isActive: true, roleIsActive: true, roleSlug: 'coordinator' }),
      ),
    ).toBe(false)
  })

  it('restricts a scoped coordinator to their own college only', () => {
    expect(
      read()(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [permission],
          collegeScope: { id: 42 },
        }),
      ),
    ).toEqual({ college: { equals: 42 } })
  })

  it('restricts a scoped coordinator on active collections too', () => {
    expect(
      read()(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [permission],
          collegeScope: 'college-1',
        }),
      ),
    ).toEqual({ college: { equals: 'college-1' } })
  })

  it('does not leak other colleges published content to a coordinator', () => {
    const result = read()(
      args({
        isActive: true,
        roleIsActive: true,
        roleSlug: 'coordinator',
        rolePermissions: [permission],
        collegeScope: { id: 42 },
      }),
    )
    expect(JSON.stringify(result)).not.toContain('_status')
  })

  it('honours a custom collegeField', () => {
    expect(
      read({ collegeField: 'ownerCollege' })(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [permission],
          collegeScope: 7,
        }),
      ),
    ).toEqual({ ownerCollege: { equals: 7 } })
  })

  it('denies inactive privileged users down to public read constraint', () => {
    expect(read()(args({ isActive: false, roleLevel: 5 }))).toEqual(publishedWhere)
  })

  it('revokes coordinator draft reads immediately when the permission is removed', () => {
    expect(
      read()(
        args({
          isActive: true,
          roleIsActive: true,
          roleSlug: 'coordinator',
          rolePermissions: [],
          collegeScope: 42,
        }),
      ),
    ).toBe(false)
  })
})
