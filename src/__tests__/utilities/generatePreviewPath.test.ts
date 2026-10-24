import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generatePreviewPath } from '@/utilities/generatePreviewPath'

const { createSessionMock } = vi.hoisted(() => ({ createSessionMock: vi.fn() }))
vi.mock('@/lib/payload/preview-session', () => ({
  PREVIEW_SESSION_QUERY: 'previewSession',
  createOrReusePreviewSession: createSessionMock,
}))

const req = { locale: 'ar', payload: { logger: {} } } as never

describe('generatePreviewPath()', () => {
  beforeEach(() => {
    createSessionMock.mockReset()
    createSessionMock.mockResolvedValue('opaque-token')
  })

  it('creates an opaque session bound to the user, collection, and document', async () => {
    const path = await generatePreviewPath({
      authSessionId: 'login-session-1',
      collection: 'pages',
      data: { id: 42, slug: 'about' },
      req,
      userId: 7,
    })

    expect(path).toBe('/next/preview?previewSession=opaque-token')
    expect(createSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      authSessionId: 'login-session-1',
      collection: 'pages',
      documentId: 42,
      userId: 7,
    }))
  })

  it('returns null on create or without an authenticated request', async () => {
    await expect(
      generatePreviewPath({
        authSessionId: 'login-session-1',
        collection: 'pages',
        data: { slug: 'unsaved' },
        req,
        userId: 7,
      }),
    ).resolves.toBeNull()
    await expect(
      generatePreviewPath({
        collection: 'pages',
        data: { id: 42 },
        req,
      }),
    ).resolves.toBeNull()
  })

  it('fails closed without a Payload login-session binding', async () => {
    await expect(generatePreviewPath({
      collection: 'pages',
      data: { id: 42 },
      req,
      userId: 7,
    })).resolves.toBeNull()
    expect(createSessionMock).not.toHaveBeenCalled()
  })
})
