import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  getPayload: vi.fn(),
  loggerInfo: vi.fn(),
  runSeed: vi.fn(),
}))

vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@payload-config', () => ({ default: { name: 'payload-config' } }))
vi.mock('../run-seed', () => ({ runSeed: mocks.runSeed }))

describe('seed CLI adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    mocks.getPayload.mockResolvedValue({
      destroy: mocks.destroy,
      logger: { info: mocks.loggerInfo },
    })
    mocks.runSeed.mockResolvedValue({
      conflict: 4,
      created: 1,
      skipped: 3,
      stages: [],
      updated: 2,
    })
  })

  it('runs the canonical seed and destroys Payload after success', async () => {
    await import('../run')

    expect(mocks.runSeed).toHaveBeenCalledOnce()
    expect(mocks.loggerInfo).toHaveBeenCalledWith({
      conflict: 4,
      created: 1,
      msg: 'Seed completed',
      skipped: 3,
      updated: 2,
    })
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })

  it('propagates failure after destroying Payload', async () => {
    const failure = new Error('seed failed')
    mocks.runSeed.mockRejectedValue(failure)

    await expect(import('../run')).rejects.toBe(failure)
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })
})
