// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SignJWT } from 'jose'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  find: vi.fn(),
  getPayload: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@payload-config', () => ({ default: { name: 'payload-config' } }))

import { getMeUser } from '../getMeUser'

const TOKEN = 'private-payload-jwt'
const SECRET = 'payload-test-secret-that-is-long-enough'

async function tokenFor(claims: Record<string, unknown> = { collection: 'users', id: 'user-1' }) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(Buffer.from(SECRET))
}

function mockCookie(value: string | undefined): void {
  mocks.cookies.mockResolvedValue({
    get: vi.fn(() => (value === undefined ? undefined : { value })),
  })
}

describe('getMeUser', () => {
  beforeEach(() => {
    mocks.cookies.mockReset()
    mocks.find.mockReset()
    mocks.getPayload.mockReset()
    mocks.getPayload.mockResolvedValue({ find: mocks.find, secret: SECRET })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null without initializing Payload when the cookie is absent', async () => {
    mockCookie(undefined)

    await expect(getMeUser()).resolves.toBeNull()
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.find).not.toHaveBeenCalled()
  })

  it('returns null for an invalid token without querying users', async () => {
    mockCookie(TOKEN)

    await expect(getMeUser()).resolves.toBeNull()
    expect(mocks.find).not.toHaveBeenCalled()
    expect(mocks.getPayload).toHaveBeenCalledWith({ config: { name: 'payload-config' } })
  })

  it('returns the authenticated user and token', async () => {
    const user = { id: 'user-1', isActive: true }
    const token = await tokenFor()
    mockCookie(token)
    mocks.find.mockResolvedValue({ docs: [user] })

    await expect(getMeUser()).resolves.toEqual({ token, user })
    expect(mocks.find).toHaveBeenCalledWith({
      collection: 'users',
      depth: 2,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { id: { equals: 'user-1' } },
    })
  })

  it('propagates operational user lookup failures without logging the token', async () => {
    const failure = new Error('auth dependency unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const token = await tokenFor()
    mockCookie(token)
    mocks.find.mockRejectedValue(failure)

    await expect(getMeUser()).rejects.toBe(failure)
    expect(consoleError).not.toHaveBeenCalled()
    expect(failure.message).not.toContain(token)
  })
})
