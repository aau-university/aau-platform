import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  error: vi.fn(),
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPayload.mockResolvedValue({
      count: mocks.count,
      logger: { error: mocks.error },
    })
    mocks.count.mockResolvedValue({ totalDocs: 1 })
  })

  it('reports healthy only after a real Payload database operation succeeds', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    await expect(response.json()).resolves.toEqual({ database: 'healthy', status: 'ok' })
    expect(mocks.count).toHaveBeenCalledWith({ collection: 'users', overrideAccess: true })
  })

  it('returns 503 and structured safe context when PostgreSQL is unavailable', async () => {
    mocks.count.mockRejectedValueOnce(new Error('connection refused'))

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      database: 'unavailable',
      status: 'error',
    })
    expect(mocks.error).toHaveBeenCalledWith({
      err: { message: 'connection refused', name: 'Error' },
      operation: 'readiness-check',
      subsystem: 'postgresql',
    })
  })
})
