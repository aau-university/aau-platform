import { describe, expect, it } from 'vitest'

import { canUploadMedia, mediaOwnerOrManager } from '../media-access'

function req(user: unknown) {
  return { req: { user } } as never
}

const coordinator = {
  id: 55,
  isActive: true,
  role: { slug: 'coordinator', isActive: true, permissions: [{ key: 'media.upload' }] },
  collegeScope: { id: 7 },
}

describe('canUploadMedia (media create)', () => {
  it('denies anonymous, students, and doctors', () => {
    expect(canUploadMedia(req(null))).toBe(false)
    expect(canUploadMedia(req({ isActive: true, role: { slug: 'student', isActive: true } }))).toBe(
      false,
    )
    expect(canUploadMedia(req({ isActive: true, role: { slug: 'doctor', isActive: true } }))).toBe(
      false,
    )
  })

  it('allows a coordinator whose role holds media.upload', () => {
    expect(canUploadMedia(req(coordinator))).toBe(true)
  })

  it('denies a coordinator without the media.upload key (admin-revocable)', () => {
    const revoked = {
      ...coordinator,
      role: { slug: 'coordinator', isActive: true, permissions: [{ key: 'news.manage' }] },
    }
    expect(canUploadMedia(req(revoked))).toBe(false)
  })

  it('allows content manager and above without a key', () => {
    expect(
      canUploadMedia(req({ isActive: true, role: { slug: 'content_manager', isActive: true } })),
    ).toBe(true)
    expect(canUploadMedia(req({ isActive: true, role: { slug: 'admin', isActive: true } }))).toBe(
      true,
    )
  })
})

describe('mediaOwnerOrManager (media update/delete)', () => {
  it('limits a permitted coordinator to their own uploads', () => {
    expect(mediaOwnerOrManager(req(coordinator))).toMatchObject({
      uploadedBy: { equals: 55 },
    })
  })

  it('denies a coordinator without the media.upload key', () => {
    const revoked = {
      ...coordinator,
      role: { slug: 'coordinator', isActive: true, permissions: [] },
    }
    expect(mediaOwnerOrManager(req(revoked))).toBe(false)
  })

  it('denies anonymous and level-1 users', () => {
    expect(mediaOwnerOrManager(req(null))).toBe(false)
    expect(
      mediaOwnerOrManager(req({ isActive: true, role: { slug: 'student', isActive: true } })),
    ).toBe(false)
  })

  it('gives content manager and above full access', () => {
    expect(
      mediaOwnerOrManager(req({ isActive: true, role: { slug: 'content_manager', isActive: true } })),
    ).toBe(true)
  })
})
