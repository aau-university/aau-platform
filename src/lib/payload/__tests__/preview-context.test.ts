import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, draftModeMock, resolveSessionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  draftModeMock: vi.fn(),
  resolveSessionMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  draftMode: draftModeMock,
  headers: async () => new Headers(),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('payload', () => ({
  getPayload: async () => ({
    auth: authMock,
    logger: { error: vi.fn() },
  }),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/lib/payload/preview-session', () => ({
  resolvePreviewSession: resolveSessionMock,
}))

import { getDraftPreviewContext } from '../preview-context'

const activeUser = { _sid: 'login-session-1', id: 7, isActive: true, roleIsActive: true }
const publicContext = {
  collection: null,
  documentId: null,
  draft: false,
  locale: null,
  token: null,
  user: null,
} as const

describe('getDraftPreviewContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    draftModeMock.mockResolvedValue({ isEnabled: true })
    resolveSessionMock.mockResolvedValue({
      authSessionId: 'login-session-1',
      collection: 'news',
      documentId: '42',
      userId: '7',
    })
    authMock.mockResolvedValue({ user: activeUser })
  })

  it('keeps a clean URL public even when the browser still has Draft Mode enabled', async () => {
    await expect(getDraftPreviewContext()).resolves.toEqual(publicContext)
    expect(draftModeMock).not.toHaveBeenCalled()
    expect(authMock).not.toHaveBeenCalled()
    expect(resolveSessionMock).not.toHaveBeenCalled()
  })

  it('rejects a preview token when Next Draft Mode is disabled', async () => {
    draftModeMock.mockResolvedValueOnce({ isEnabled: false })
    await expect(getDraftPreviewContext('opaque')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(authMock).not.toHaveBeenCalled()
    expect(resolveSessionMock).not.toHaveBeenCalled()
  })

  it('re-authenticates every draft request and rejects a logged-out session', async () => {
    authMock.mockResolvedValueOnce({ user: null })
    await expect(getDraftPreviewContext('opaque')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(authMock).toHaveBeenCalledOnce()
  })

  it('rejects a role deactivated after draft mode was enabled', async () => {
    authMock.mockResolvedValueOnce({
      user: { ...activeUser, roleIsActive: false },
    })
    await expect(getDraftPreviewContext('opaque')).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('returns the ticket-bound document context for the active user', async () => {
    await expect(getDraftPreviewContext('opaque')).resolves.toMatchObject({
      draft: true,
      user: activeUser,
      collection: 'news',
      documentId: '42',
    })
  })

  it('rejects authority issued under a previous Payload login session', async () => {
    resolveSessionMock.mockResolvedValueOnce({
      authSessionId: 'old-login-session',
      collection: 'news',
      documentId: '42',
      userId: '7',
    })
    await expect(getDraftPreviewContext('opaque')).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
