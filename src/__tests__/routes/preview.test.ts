import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authMock,
  enableMock,
  findByIDMock,
  redirectMock,
  resolveSessionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  enableMock: vi.fn(),
  findByIDMock: vi.fn(),
  redirectMock: vi.fn(),
  resolveSessionMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  draftMode: async () => ({ enable: enableMock }),
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))

vi.mock('payload', () => ({
  getPayload: async () => ({
    auth: authMock,
    findByID: findByIDMock,
    logger: { error: vi.fn() },
    config: {
      collections: [
        { slug: 'pages', versions: { drafts: true } },
        { slug: 'academic-programs', versions: { drafts: true } },
      ],
    },
  }),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/lib/payload/preview-session', () => ({
  PREVIEW_SESSION_QUERY: 'previewSession',
  PreviewSessionUnavailableError: class PreviewSessionUnavailableError extends Error {},
  resolvePreviewSession: resolveSessionMock,
}))

import { GET } from '@/app/(frontend)/next/preview/route'

const activeUser = {
  _sid: 'login-session-1',
  id: 7,
  isActive: true,
  roleIsActive: true,
}

function request(value = 'opaque-token'): Request {
  return new Request(`http://localhost/next/preview?previewSession=${encodeURIComponent(value)}`)
}

describe('next/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: activeUser })
    findByIDMock.mockResolvedValue({ id: 42, slug: 'about' })
    resolveSessionMock.mockResolvedValue({
      authSessionId: 'login-session-1',
      collection: 'pages',
      documentId: '42',
      userId: '7',
    })
  })

  it('requires a live authenticated session', async () => {
    authMock.mockResolvedValueOnce({ user: null })
    expect((await GET(request())).status).toBe(401)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('rejects a deactivated user', async () => {
    authMock.mockResolvedValueOnce({ user: { ...activeUser, isActive: false } })
    expect((await GET(request())).status).toBe(401)
  })

  it('rejects a user whose role was deactivated', async () => {
    authMock.mockResolvedValueOnce({ user: { ...activeUser, roleIsActive: false } })
    expect((await GET(request())).status).toBe(401)
  })

  it('rejects a session issued to another user', async () => {
    resolveSessionMock.mockResolvedValueOnce({ authSessionId: 'login-session-1', collection: 'pages', documentId: '42', userId: '99' })
    expect((await GET(request())).status).toBe(401)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('rejects a session issued under a previous Payload login session', async () => {
    resolveSessionMock.mockResolvedValueOnce({ authSessionId: 'old-login-session', collection: 'pages', documentId: '42', userId: '7' })
    expect((await GET(request())).status).toBe(401)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('rejects an expired or revoked session', async () => {
    resolveSessionMock.mockResolvedValueOnce(null)
    expect((await GET(request())).status).toBe(401)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('rejects a session for an unknown collection', async () => {
    resolveSessionMock.mockResolvedValueOnce({ authSessionId: 'login-session-1', collection: 'not-a-real-collection', documentId: '42', userId: '7' })
    expect((await GET(request())).status).toBe(400)
    expect(findByIDMock).not.toHaveBeenCalled()
  })

  it('does not fall back to a slug or hide infrastructure errors', async () => {
    findByIDMock.mockRejectedValueOnce(new Error('forbidden'))
    resolveSessionMock.mockResolvedValueOnce({ authSessionId: 'login-session-1', collection: 'pages', documentId: 'other-doc', userId: '7' })
    expect((await GET(request())).status).toBe(500)
    expect(findByIDMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'other-doc',
        draft: true,
        overrideAccess: false,
        user: activeUser,
      }),
    )
  })

  it('loads the latest authorized draft and preserves the document-bound session', async () => {
    redirectMock.mockImplementationOnce((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })

    await expect(GET(request())).rejects.toThrow('REDIRECT:/about')

    expect(findByIDMock).toHaveBeenCalledWith({
      collection: 'pages',
      id: '42',
      depth: 2,
      draft: true,
      overrideAccess: false,
      user: activeUser,
    })
    expect(enableMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/about?previewSession=opaque-token')
  })

  it('builds a changed nested path from the latest draft relationships', async () => {
    findByIDMock.mockResolvedValueOnce({
      id: 42,
      slug: 'new-program-slug',
      college: { slug: 'new-college-slug' },
    })
    redirectMock.mockImplementationOnce((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })

    await expect(
      (resolveSessionMock.mockResolvedValueOnce({ authSessionId: 'login-session-1', collection: 'academic-programs', documentId: '42', userId: '7' }), GET(request())),
    ).rejects.toThrow(
      'REDIRECT:/colleges/new-college-slug/programs/new-program-slug',
    )
  })
})
