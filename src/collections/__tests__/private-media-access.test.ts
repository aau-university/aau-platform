import { describe, expect, it } from 'vitest'

import { PrivateMedia } from '../PrivateMedia'

const anonymous = null
const student = { isActive: true, role: { slug: 'student', isActive: true } }
const coordinator = {
  isActive: true,
  role: { slug: 'coordinator', isActive: true, permissions: [{ key: 'media.upload' }] },
  collegeScope: { id: 1 },
}
const contentManager = { isActive: true, role: { slug: 'content_manager', isActive: true } }
const admin = { isActive: true, role: { slug: 'admin', isActive: true } }

function req(user: unknown) {
  return { req: { user } } as never
}

describe('PrivateMedia access', () => {
  it('lets content managers create private files from the admin panel (student-docs publishing)', async () => {
    const create = PrivateMedia.access?.create
    if (!create) throw new Error('PrivateMedia create access is not configured')

    expect(await create(req(contentManager))).toBe(true)
    expect(await create(req(admin))).toBe(true)
  })

  it('denies private-media creation below content manager, including coordinators', async () => {
    const create = PrivateMedia.access?.create
    if (!create) throw new Error('PrivateMedia create access is not configured')

    expect(await create(req(anonymous))).toBe(false)
    expect(await create(req(student))).toBe(false)
    expect(await create(req(coordinator))).toBe(false)
  })

  it('keeps private-media reads unavailable to anonymous users and coordinators', async () => {
    const read = PrivateMedia.access?.read
    if (!read) throw new Error('PrivateMedia read access is not configured')

    expect(await read(req(anonymous))).toBe(false)
    expect(await read(req(student))).toBe(false)
    expect(await read(req(coordinator))).toBe(false)
  })

  it('allows content managers and admins to read private media (they already read join requests)', async () => {
    const read = PrivateMedia.access?.read
    if (!read) throw new Error('PrivateMedia read access is not configured')

    expect(await read(req(contentManager))).toBe(true)
    expect(await read(req(admin))).toBe(true)
  })

  it('keeps deletion at admin level and above only', async () => {
    const del = PrivateMedia.access?.delete
    if (!del) throw new Error('PrivateMedia delete access is not configured')

    expect(await del(req(contentManager))).toBe(false)
    expect(await del(req(coordinator))).toBe(false)
    expect(await del(req(admin))).toBe(true)
  })
})
