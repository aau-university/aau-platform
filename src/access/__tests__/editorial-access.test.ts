import type { Access } from 'payload'
import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { AcademicPrograms } from '@/collections/AcademicPrograms'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { StudyPlans } from '@/collections/StudyPlans'
import { contentManagerEditorialAccess, coordinatorEditorialAccess } from '../editorial-access'

type AccessArgs = Parameters<Access>[0]

function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

function call(access: Access | undefined, user: unknown) {
  if (!access) throw new Error('Expected collection access function')
  return access(args(user))
}

describe('editorial access factories', () => {
  it('keeps unscoped drafts restricted to Content Manager+', () => {
    const access = contentManagerEditorialAccess()

    expect(call(access.read, null)).toEqual({
      _status: { equals: 'published' },
    })
    expect(
      call(access.read, {
        isActive: true,
        roleIsActive: true,
        roleLevel: 3,
      }),
    ).toBe(true)
    expect(call(access.create, null)).toBe(false)
    expect(call(access.delete, null)).toBe(false)
  })

  it('adds parent publication only to public coordinator-scoped reads', () => {
    const access = coordinatorEditorialAccess({
      permission: 'programs.manage',
      publishedRelations: ['college'],
    })

    expect(call(access.read, null)).toEqual({
      and: [{ _status: { equals: 'published' } }, { 'college._status': { equals: 'published' } }],
    })
    expect(
      call(access.read, {
        isActive: true,
        roleIsActive: true,
        roleSlug: 'coordinator',
        rolePermissions: ['programs.manage'],
        collegeScope: 42,
      }),
    ).toEqual({ college: { equals: 42 } })
  })

  it('wires the complete academic parent chain into real configs', () => {
    const publishedCollegeChild = {
      and: [{ _status: { equals: 'published' } }, { 'college._status': { equals: 'published' } }],
    }
    expect(call(AcademicPrograms.access?.read, null)).toEqual(publishedCollegeChild)
    expect(call(AcademicDepartments.access?.read, null)).toEqual(publishedCollegeChild)
    expect(call(FacultyMembers.access?.read, null)).toEqual(publishedCollegeChild)
    expect(call(StudyPlans.access?.read, null)).toEqual({
      and: [
        { _status: { equals: 'published' } },
        { 'academicProgram._status': { equals: 'published' } },
        { 'academicProgram.college._status': { equals: 'published' } },
      ],
    })
  })
})
