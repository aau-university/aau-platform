import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMeUser: vi.fn(),
  getPayload: vi.fn(),
  runSeed: vi.fn(),
}))

vi.mock('@/utilities/getMeUser', () => ({ getMeUser: mocks.getMeUser }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/seed/run-seed', () => ({
  runSeed: mocks.runSeed,
  SeedAlreadyRunningError: class SeedAlreadyRunningError extends Error {},
  SeedConnectionError: class SeedConnectionError extends Error {},
}))

import * as route from '@/app/(frontend)/next/seed/route'

const ORIGIN = 'https://cms.example.edu'
const SEED_SECRET = 'a'.repeat(64)
const WRONG_SECRET = 'b'.repeat(64)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const superAdmin = {
  id: 'super-admin',
  isActive: true,
  role: { isActive: true, slug: 'super_admin' },
}

function request({
  body,
  headers,
  url = `${ORIGIN}/next/seed`,
}: {
  body?: string
  headers?: HeadersInit
  url?: string
} = {}): Request {
  return new Request(url, {
    body,
    headers:
      headers ??
      {
        origin: ORIGIN,
        'x-payload-seed-secret': SEED_SECRET,
      },
    method: 'POST',
  })
}

async function expectError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('no-store')
  const body = await response.json()
  expect(body).toEqual({
    correlationId: expect.stringMatching(UUID_PATTERN),
    error,
    success: false,
  })
  return body
}

describe('POST /next/seed security gates', () => {
  beforeEach(() => {
    mocks.getMeUser.mockReset()
    mocks.getPayload.mockReset()
    mocks.runSeed.mockReset()
    mocks.getMeUser.mockResolvedValue({ token: 'session', user: superAdmin })
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PAYLOAD_SEED_ENABLED', 'true')
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', ORIGIN)
    vi.stubEnv('PAYLOAD_SEED_SECRET', SEED_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('exports only POST behavior with the configured duration and default Node runtime', () => {
    expect(route).not.toHaveProperty('runtime')
    expect(route).not.toHaveProperty('GET')
    expect(route.maxDuration).toBe(200)
  })

  it.each([undefined, '', 'false', 'TRUE', '1', ' true']) (
    'returns a generic 404 before config, auth, or Payload when enabled is %s',
    async (enabled) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.stubEnv('PAYLOAD_SEED_ENABLED', enabled)
      vi.stubEnv('PAYLOAD_SERVER_ORIGIN', undefined)
      vi.stubEnv('PAYLOAD_SEED_SECRET', undefined)

      await expectError(await route.POST(request()), 404, 'not_found')

      expect(consoleError).not.toHaveBeenCalled()
      expect(mocks.getMeUser).not.toHaveBeenCalled()
      expect(mocks.getPayload).not.toHaveBeenCalled()
      expect(mocks.runSeed).not.toHaveBeenCalled()
    },
  )

  it('logs each fixed invalid-config reason at most once', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', 'not-an-origin')

    await route.POST(request())
    await route.POST(request())
    await route.POST(request())

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Seed endpoint server configuration is invalid',
      expect.objectContaining({
        correlationId: expect.stringMatching(UUID_PATTERN),
        reason: 'invalid_origin',
      }),
    )
  })

  it.each([
    [undefined, 'missing'],
    ['', 'empty'],
    ['ftp://cms.example.edu', 'non-http'],
    ['https://user:pass@cms.example.edu', 'credentials'],
    ['https://cms.example.edu?mode=seed', 'query'],
    ['https://cms.example.edu#seed', 'hash'],
    ['https://cms.example.edu/next', 'non-root path'],
    [' https://cms.example.edu', 'whitespace'],
  ])('rejects invalid configured origin: %s (%s)', async (configuredOrigin, _case) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', configuredOrigin)

    await expectError(await route.POST(request()), 503, 'unavailable')

    expect(mocks.getMeUser).not.toHaveBeenCalled()
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it.each([
    'https://localhost:3000',
    'https://api.localhost:3000',
    'https://127.0.0.2',
    'https://[::1]',
    'https://[::ffff:127.42.1.9]',
  ])(
    'rejects production loopback configured origin %s',
    async (configuredOrigin) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('PAYLOAD_SERVER_ORIGIN', configuredOrigin)

      await expectError(await route.POST(request()), 503, 'unavailable')
      expect(mocks.getMeUser).not.toHaveBeenCalled()
    },
  )

  it('rejects a non-loopback HTTP origin in production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', 'http://cms.example.edu')

    await expectError(await route.POST(request()), 503, 'unavailable')
    expect(mocks.getMeUser).not.toHaveBeenCalled()
  })

  it('allows HTTP origins outside production', async () => {
    const origin = 'http://localhost:3000'
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', origin)

    await route.POST(
      request({
        headers: { origin, 'x-payload-seed-secret': SEED_SECRET },
        url: `${origin}/next/seed`,
      }),
    )

    expect(mocks.getMeUser).toHaveBeenCalledOnce()
  })

  it('accepts a root trailing slash in configured origin', async () => {
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', `${ORIGIN}/`)

    await route.POST(request())

    expect(mocks.getMeUser).toHaveBeenCalledOnce()
  })

  it.each([
    [undefined, 'missing'],
    ['', 'empty'],
    ['a'.repeat(63), 'too short'],
    ['a'.repeat(65), 'too long'],
    ['g'.repeat(64), 'non-hex'],
    [`${'a'.repeat(63)} `, 'whitespace'],
    ['INVALID_REPLACE_WITH_64_HEX_CHARACTERS', 'placeholder'],
  ])('fails closed for weak seed secret: %s (%s)', async (secret, _case) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubEnv('PAYLOAD_SEED_SECRET', secret)

    await expectError(await route.POST(request()), 503, 'unavailable')
    expect(mocks.getMeUser).not.toHaveBeenCalled()
  })

  it('does not include configuration or secret values in invalid-config logs or responses', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const leaked = 'https://user:leaked-password@cms.example.edu/private?token=leaked'
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', leaked)

    const response = await route.POST(request())
    const body = await expectError(response, 503, 'unavailable')
    const output = JSON.stringify([body, consoleError.mock.calls])

    expect(output).not.toContain('leaked-password')
    expect(output).not.toContain('token=leaked')
    expect(output).not.toContain(SEED_SECRET)
  })

  it.each([
    [`${ORIGIN}/next/seed?secret=${SEED_SECRET}`, 'credential query'],
    [`${ORIGIN}/next/seed?stage=roles`, 'stage query'],
    [`${ORIGIN}/next/seed?resetTarget=news`, 'reset query'],
  ])('rejects every query string before auth: %s (%s)', async (url) => {
    await expectError(await route.POST(request({ url })), 400, 'bad_request')
    expect(mocks.getMeUser).not.toHaveBeenCalled()
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it.each(['{}', ' ', 'null', SEED_SECRET])('rejects any framed request body %j', async (body) => {
    await expectError(
      await route.POST(
        request({
          body,
          headers: {
            'content-length': String(Buffer.byteLength(body)),
            origin: ORIGIN,
            'x-payload-seed-secret': SEED_SECRET,
          },
        }),
      ),
      400,
      'bad_request',
    )
    expect(mocks.getMeUser).not.toHaveBeenCalled()
  })

  it.each([
    ['1', 'positive'],
    ['-1', 'negative'],
    ['1.0', 'non-decimal'],
    ['0, 0', 'comma/multiple'],
    ['184467440737095516160', 'overflow/nonzero'],
    ['', 'empty'],
  ])('rejects Content-Length %j (%s)', async (contentLength) => {
    await expectError(
      await route.POST(
        request({
          headers: {
            'content-length': contentLength,
            origin: ORIGIN,
            'x-payload-seed-secret': SEED_SECRET,
          },
        }),
      ),
      400,
      'bad_request',
    )
    expect(mocks.getMeUser).not.toHaveBeenCalled()
  })

  it('rejects Transfer-Encoding even with Content-Length zero and no body', async () => {
    await expectError(
      await route.POST(
        request({
          headers: {
            'content-length': '0',
            origin: ORIGIN,
            'transfer-encoding': 'chunked',
            'x-payload-seed-secret': SEED_SECRET,
          },
        }),
      ),
      400,
      'bad_request',
    )
    expect(mocks.getMeUser).not.toHaveBeenCalled()
  })

  it('accepts Next adapter unframed empty stream shape without consuming it', async () => {
    const pull = vi.fn(() => {
      throw new Error('body stream must never be consumed')
    })
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({ cancel, pull }, { highWaterMark: 0 })
    const streamRequest = new Request(`${ORIGIN}/next/seed`, {
      body: stream,
      duplex: 'half',
      headers: { origin: ORIGIN, 'x-payload-seed-secret': SEED_SECRET },
      method: 'POST',
    } as RequestInit & { duplex: 'half' })
    const text = vi.spyOn(streamRequest, 'text')
    const json = vi.spyOn(streamRequest, 'json')
    const formData = vi.spyOn(streamRequest, 'formData')

    await route.POST(streamRequest)

    expect(pull).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
    expect(formData).not.toHaveBeenCalled()
    expect(mocks.getMeUser).toHaveBeenCalledOnce()
  })

  it.each([
    [undefined, 'missing'],
    ['null', 'opaque null'],
    ['not-an-origin', 'malformed'],
    ['http://cms.example.edu', 'scheme mismatch'],
    ['https://evil.example.edu', 'host mismatch'],
    ['https://sub.cms.example.edu', 'subdomain mismatch'],
    ['https://cms.example.edu:444', 'port mismatch'],
    ['https://cms.example.edu.evil.test', 'suffix spoof'],
    ['https://evil-cms.example.edu', 'prefix spoof'],
    ['https://user@cms.example.edu', 'credentials'],
    ['https://cms.example.edu/', 'root path suffix'],
    ['https://cms.example.edu?trusted=true', 'query suffix'],
  ])('rejects spoofed browser origin: %s (%s)', async (origin, _case) => {
    const headers = new Headers({ 'x-payload-seed-secret': SEED_SECRET })
    if (origin !== undefined) headers.set('origin', origin)

    await expectError(await route.POST(request({ headers })), 403, 'forbidden')
    expect(mocks.getMeUser).not.toHaveBeenCalled()
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it.each([undefined, '', 'wrong', ` ${SEED_SECRET}`, `${SEED_SECRET} `, WRONG_SECRET])(
    'requires the exact dedicated secret header: %s',
    async (secret) => {
      const rawRequest = request()
      Object.defineProperty(rawRequest, 'headers', {
        value: {
          get(name: string) {
            if (name.toLowerCase() === 'origin') return ORIGIN
            if (name.toLowerCase() === 'x-payload-seed-secret') return secret ?? null
            return null
          },
          has(name: string) {
            if (name.toLowerCase() === 'origin') return true
            if (name.toLowerCase() === 'x-payload-seed-secret') return secret !== undefined
            return false
          },
        },
      })

      await expectError(await route.POST(rawRequest), 401, 'unauthorized')
      expect(mocks.getMeUser).not.toHaveBeenCalled()
      expect(mocks.getPayload).not.toHaveBeenCalled()
    },
  )

  it('returns 401 for no authenticated session', async () => {
    mocks.getMeUser.mockResolvedValue(null)

    await expectError(await route.POST(request()), 401, 'unauthorized')
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('maps authentication dependency rejection to generic 503', async () => {
    mocks.getMeUser.mockRejectedValue(new Error(`auth failed ${SEED_SECRET}`))

    await expectError(await route.POST(request()), 503, 'unavailable')
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.runSeed).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...superAdmin, isActive: false }, 'inactive user'],
    [{ ...superAdmin, role: { isActive: false, slug: 'super_admin' } }, 'inactive role'],
    [{ ...superAdmin, role: { isActive: true, slug: 'admin' } }, 'non-super-admin'],
  ])('returns 403 for authenticated %s (%s)', async (user) => {
    mocks.getMeUser.mockResolvedValue({ token: 'session', user })

    await expectError(await route.POST(request()), 403, 'forbidden')
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.runSeed).not.toHaveBeenCalled()
  })
})
