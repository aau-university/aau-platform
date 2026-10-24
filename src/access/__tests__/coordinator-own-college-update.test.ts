import { describe, expect, it } from 'vitest'

import { coordinatorOwnCollegeUpdate } from '../coordinator-own-college-update'

function req(user: unknown) {
  return { req: { user } } as never
}

function coordinatorWith(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    role: {
      slug: 'coordinator',
      isActive: true,
      permissions: [{ key: 'colleges.manage' }],
    },
    collegeScope: { id: 7 },
    ...overrides,
  }
}

describe('coordinatorOwnCollegeUpdate access (Colleges collection)', () => {
  it('denies anonymous, empty, and level-1 users', () => {
    expect(coordinatorOwnCollegeUpdate(req(null))).toBe(false)
    expect(coordinatorOwnCollegeUpdate(req({}))).toBe(false)
    expect(
      coordinatorOwnCollegeUpdate(req({ isActive: true, role: { slug: 'student', isActive: true } })),
    ).toBe(false)
  })

  it('pins a permitted coordinator to exactly their own college document', () => {
    expect(coordinatorOwnCollegeUpdate(req(coordinatorWith()))).toMatchObject({
      id: { equals: 7 },
    })
  })

  it('denies a coordinator without the colleges.manage key', () => {
    const noKey = coordinatorWith({
      role: { slug: 'coordinator', isActive: true, permissions: [{ key: 'news.manage' }] },
    })
    expect(coordinatorOwnCollegeUpdate(req(noKey))).toBe(false)
  })

  it('denies a coordinator without a collegeScope', () => {
    expect(coordinatorOwnCollegeUpdate(req(coordinatorWith({ collegeScope: undefined })))).toBe(false)
  })

  it('denies an inactive coordinator', () => {
    expect(coordinatorOwnCollegeUpdate(req(coordinatorWith({ isActive: false })))).toBe(false)
  })

  it('allows content manager and above unconditionally', () => {
    const cm = { isActive: true, role: { slug: 'content_manager', isActive: true } }
    const admin = { isActive: true, role: { slug: 'admin', isActive: true } }
    expect(coordinatorOwnCollegeUpdate(req(cm))).toBe(true)
    expect(coordinatorOwnCollegeUpdate(req(admin))).toBe(true)
  })
})
