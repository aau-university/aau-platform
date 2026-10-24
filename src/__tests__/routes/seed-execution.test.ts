import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  class SeedAlreadyRunningError extends Error {}
  class SeedConnectionError extends Error {}
  return {
    SeedAlreadyRunningError,
    SeedConnectionError,
    getMeUser: vi.fn(),
    getPayload: vi.fn(),
    runSeed: vi.fn(),
  }
})

vi.mock('@/utilities/getMeUser', () => ({ getMeUser: mocks.getMeUser }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@payload-config', () => ({ default: { name: 'payload-config' } }))
vi.mock('@/seed/run-seed', () => ({
  runSeed: mocks.runSeed,
  SeedAlreadyRunningError: mocks.SeedAlreadyRunningError,
  SeedConnectionError: mocks.SeedConnectionError,
}))

import { POST } from '@/app/(frontend)/next/seed/route'

const ORIGIN = 'https://cms.example.edu'
const SEED_SECRET = 'a'.repeat(64)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const loggerError = vi.fn()
const destroy = vi.fn()
const payload = { destroy, logger: { error: loggerError } }

function request(): Request {
  return new Request(`${ORIGIN}/next/seed`, {
    headers: {
      origin: ORIGIN,
      'x-payload-seed-secret': SEED_SECRET,
    },
    method: 'POST',
  })
}

async function bodyOf(response: Response) {
  expect(response.headers.get('cache-control')).toBe('no-store')
  const body = await response.json()
  expect(body.correlationId).toMatch(UUID_PATTERN)
  return body
}

describe('POST /next/seed canonical execution adapter', () => {
  beforeEach(() => {
    mocks.getMeUser.mockReset()
    mocks.getPayload.mockReset()
    mocks.runSeed.mockReset()
    loggerError.mockReset()
    destroy.mockReset()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PAYLOAD_SEED_ENABLED', 'true')
    vi.stubEnv('PAYLOAD_SERVER_ORIGIN', ORIGIN)
    vi.stubEnv('PAYLOAD_SEED_SECRET', SEED_SECRET)
    mocks.getMeUser.mockResolvedValue({
      token: 'session',
      user: {
        id: 'super-admin',
        isActive: true,
        role: { isActive: true, slug: 'super_admin' },
      },
    })
    mocks.getPayload.mockResolvedValue(payload)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('accepts a normal no-body request and returns exact canonical results', async () => {
    const stages = [
      { conflict: 4, created: 2, name: 'roles', skipped: 3, status: 'success', updated: 1 },
    ]
    mocks.runSeed.mockResolvedValue({
      conflict: 4,
      created: 2,
      skipped: 3,
      stages,
      updated: 1,
    })

    const noBodyRequest = request()
    expect(noBodyRequest.body).toBeNull()
    const response = await POST(noBodyRequest)
    const body = await bodyOf(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      correlationId: expect.stringMatching(UUID_PATTERN),
      stages,
      success: true,
      summary: { conflict: 4, created: 2, skipped: 3, updated: 1 },
    })
    expect(mocks.getPayload).toHaveBeenCalledOnce()
    expect(mocks.runSeed).toHaveBeenCalledOnce()
    expect(mocks.runSeed.mock.calls[0]![0]).toBe(payload)
    expect(Object.keys(mocks.runSeed.mock.calls[0]![1])).toEqual(['onStageResult'])
    expect(mocks.runSeed.mock.calls[0]![1]).not.toHaveProperty('stages')
    expect(mocks.runSeed.mock.calls[0]![1]).not.toHaveProperty('resetTarget')
    expect(mocks.runSeed.mock.calls[0]![1]).not.toHaveProperty('failureHook')
    expect(destroy).not.toHaveBeenCalled()
  })

  it.each([undefined, '0'])('accepts the Next adapter empty stream shape with Content-Length %s', async (contentLength) => {
    const pull = vi.fn(() => {
      throw new Error('adapter body stream must never be consumed')
    })
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({ cancel, pull }, { highWaterMark: 0 })
    const headers = new Headers({
      origin: ORIGIN,
      'x-payload-seed-secret': SEED_SECRET,
    })
    if (contentLength !== undefined) headers.set('content-length', contentLength)
    const adapterShapedRequest = new Request(`${ORIGIN}/next/seed`, {
      body: stream,
      duplex: 'half',
      headers,
      method: 'POST',
    } as RequestInit & { duplex: 'half' })
    const text = vi.spyOn(adapterShapedRequest, 'text')
    const json = vi.spyOn(adapterShapedRequest, 'json')
    const formData = vi.spyOn(adapterShapedRequest, 'formData')
    mocks.runSeed.mockResolvedValue({
      conflict: 0,
      created: 0,
      skipped: 0,
      stages: [],
      updated: 0,
    })

    const response = await POST(adapterShapedRequest)

    expect(response.status).toBe(200)
    expect(pull).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
    expect(formData).not.toHaveBeenCalled()
    expect(mocks.runSeed).toHaveBeenCalledOnce()
  })

  it.each([
    [new mocks.SeedAlreadyRunningError('private lock detail'), 409, 'seed_in_progress'],
    [new mocks.SeedConnectionError('postgresql://user:password@db/private'), 503, 'unavailable'],
    [new Error('secret stack and DB row'), 500, 'seed_failed'],
  ])('maps canonical and unexpected failures to generic responses', async (error, status, code) => {
    mocks.runSeed.mockRejectedValue(error)

    const response = await POST(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(status)
    expect(body).toEqual({
      correlationId: expect.stringMatching(UUID_PATTERN),
      error: code,
      success: false,
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain(error.message)
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('DB row')
    expect(destroy).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalledWith({
      correlationId: expect.stringMatching(UUID_PATTERN),
      errorType: code,
      msg: 'Seed request failed',
    })
  })

  it('captures a failed canonical stage for safe diagnostics', async () => {
    mocks.runSeed.mockImplementation(async (_payload, options) => {
      options.onStageResult({
        conflict: 0,
        created: 0,
        error: new Error('private stage failure'),
        name: 'academic programs',
        skipped: 0,
        status: 'failed',
        updated: 0,
      })
      throw new Error('private orchestrator failure')
    })

    const response = await POST(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(500)
    expect(body).toEqual({
      correlationId: expect.stringMatching(UUID_PATTERN),
      error: 'seed_failed',
      stage: 'academic programs',
      success: false,
    })
    expect(loggerError).toHaveBeenCalledWith({
      correlationId: expect.stringMatching(UUID_PATTERN),
      errorType: 'seed_failed',
      msg: 'Seed request failed',
      stage: 'academic programs',
    })
  })

  it('omits an unsafe failed-stage value from logs and response', async () => {
    const unsafeStage = `users\n${SEED_SECRET}\npostgresql://password@db`
    mocks.runSeed.mockImplementation(async (_payload, options) => {
      options.onStageResult({ name: unsafeStage, status: 'failed' })
      throw new Error('failure')
    })

    const response = await POST(request())
    const body = await bodyOf(response)

    expect(body).not.toHaveProperty('stage')
    expect(JSON.stringify([body, loggerError.mock.calls])).not.toContain(unsafeStage)
  })

  it('maps Payload initialization failure without leaking it or attempting seed/destroy', async () => {
    mocks.getPayload.mockRejectedValue(new Error('database URL and stack'))

    const response = await POST(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(503)
    expect(body).toEqual({
      correlationId: expect.stringMatching(UUID_PATTERN),
      error: 'unavailable',
      success: false,
    })
    expect(JSON.stringify(body)).not.toContain('database URL')
    expect(mocks.runSeed).not.toHaveBeenCalled()
    expect(loggerError).not.toHaveBeenCalled()
    expect(destroy).not.toHaveBeenCalled()
  })
})
