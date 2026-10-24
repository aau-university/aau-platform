import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, destroySessionMock, disableMock, resolveSessionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  destroySessionMock: vi.fn(),
  disableMock: vi.fn(),
  resolveSessionMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  draftMode: async () => ({ disable: disableMock }),
}))

vi.mock('payload', () => ({
  getPayload: async () => ({
    auth: authMock,
    logger: { error: vi.fn() },
  }),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/lib/payload/preview-session', () => ({
  destroyPreviewSession: destroySessionMock,
  PREVIEW_SESSION_QUERY: 'previewSession',
  PreviewSessionUnavailableError: class PreviewSessionUnavailableError extends Error {},
  resolvePreviewSession: resolveSessionMock,
}))

import { GET } from '@/app/(frontend)/next/exit-preview/route'

const activeUser = { _sid: 'login-session-1', id: 7 }
const session = {
  authSessionId: 'login-session-1',
  collection: 'pages',
  documentId: '42',
  userId: '7',
}

function request(query = 'previewSession=opaque-token'): Request {
  return new Request(`http://localhost/next/exit-preview?${query}`)
}

describe('next/exit-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: activeUser })
    resolveSessionMock.mockResolvedValue(session)
  })

  it('disables Draft Mode and revokes a session owned by the current login', async () => {
    const response = await GET(request('previewSession=opaque-token&returnTo=%2Fabout%3Fx%3D1'))

    expect(disableMock).toHaveBeenCalledOnce()
    expect(authMock).toHaveBeenCalledOnce()
    expect(authMock.mock.calls[0]?.[0]).toHaveProperty('headers')
    expect(resolveSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'opaque-token' }),
    )
    expect(destroySessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'opaque-token' }),
    )
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/about?x=1')
  })

  it('does not resolve or revoke a token for an anonymous request', async () => {
    authMock.mockResolvedValueOnce({ user: null })

    const response = await GET(request())

    expect(disableMock).toHaveBeenCalledOnce()
    expect(resolveSessionMock).not.toHaveBeenCalled()
    expect(destroySessionMock).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
  })

  it.each([
    ['another user', { ...session, userId: '99' }],
    ['another login session', { ...session, authSessionId: 'old-login-session' }],
  ])('does not revoke a token issued to %s', async (_label, otherSession) => {
    resolveSessionMock.mockResolvedValueOnce(otherSession)

    const response = await GET(request())

    expect(destroySessionMock).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
  })

  it('does not revoke an expired or unknown token', async () => {
    resolveSessionMock.mockResolvedValueOnce(null)

    const response = await GET(request())

    expect(destroySessionMock).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
  })

  it('rejects an external return target without exposing the token', async () => {
    const response = await GET(
      request('previewSession=opaque-token&returnTo=https%3A%2F%2Fevil.example%2F'),
    )

    expect(response.headers.get('location')).toBe('/')
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
  })
})
