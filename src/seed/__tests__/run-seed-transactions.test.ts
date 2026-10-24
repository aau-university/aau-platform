import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payloadBoundary = vi.hoisted(() => ({
  commitTransaction: vi.fn(),
  createLocalReq: vi.fn(),
  initTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

vi.mock('payload', () => payloadBoundary)

import { runSeed } from '../run-seed'
import {
  directPoolOptions,
  restoreSeedTestEnvironment,
  setupSeedTestEnvironment,
} from './run-seed.test-helpers'

describe('runSeed transactions', () => {
  let environment: ReturnType<typeof setupSeedTestEnvironment>

  beforeEach(() => {
    environment = setupSeedTestEnvironment()
    vi.resetAllMocks()
  })

  afterEach(() => {
    restoreSeedTestEnvironment(environment)
  })

  it('rolls back and rethrows a stage failure without running dependent stages', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    const failure = new Error('stage failed')
    const diagnostics = vi.fn(() => {
      throw new Error('diagnostic observer failed')
    })
    const failedStage = vi.fn(async ({ req: stageReq }) => {
      expect(stageReq).toBe(req)
      throw failure
    })
    const dependentStage = vi.fn()
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    let thrown: unknown
    try {
      await runSeed(payload as never, {
        onStageResult: diagnostics,
        stages: [
          { name: 'roles', run: failedStage },
          { name: 'users', run: dependentStage },
        ],
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(failure)
    expect(payloadBoundary.createLocalReq).toHaveBeenCalledWith(
      {
        context: { disableRevalidate: true, seed: true },
        fallbackLocale: false,
      },
      payload,
    )
    expect(payloadBoundary.initTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.killTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.commitTransaction).not.toHaveBeenCalled()
    expect(dependentStage).not.toHaveBeenCalled()
    expect(diagnostics).toHaveBeenCalledWith({
      conflict: 0,
      created: 0,
      error: failure,
      name: 'roles',
      skipped: 0,
      status: 'failed',
      updated: 0,
    })
  })

  it('fails before stage operations when Payload does not start a transaction', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    const stage = vi.fn()
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(false)

    await expect(
      runSeed(payload as never, {
        stages: [{ name: 'roles', run: stage }],
      }),
    ).rejects.toThrow('could not start a database transaction')

    expect(stage).not.toHaveBeenCalled()
    expect(payloadBoundary.killTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.commitTransaction).not.toHaveBeenCalled()
  })

  it('rolls back without committing when a stage returns invalid counts', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    await expect(
      runSeed(payload as never, {
        stages: [
          {
            name: 'roles',
            run: async () => ({ conflict: 0, created: -1, skipped: 0, updated: 0 }),
          },
        ],
      }),
    ).rejects.toThrow('returned an invalid created count')

    expect(payloadBoundary.killTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.commitTransaction).not.toHaveBeenCalled()
  })

  it('rolls back without committing when a stage omits a count field', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    const incompleteStage = vi.fn().mockResolvedValue({ created: 1, skipped: 0, updated: 0 })
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    await expect(
      runSeed(payload as never, {
        stages: [{ name: 'roles', run: incompleteStage }],
      }),
    ).rejects.toThrow('exactly created, updated, skipped, and conflict counts')

    expect(payloadBoundary.killTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.commitTransaction).not.toHaveBeenCalled()
  })

  it('rolls back without committing when a JavaScript stage returns undefined', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    const undefinedStage = vi.fn().mockResolvedValue(undefined)
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    await expect(
      runSeed(payload as never, {
        stages: [{ name: 'roles', run: undefinedStage }],
      }),
    ).rejects.toThrow('must return exactly created, updated, skipped, and conflict counts')

    expect(payloadBoundary.killTransaction).toHaveBeenCalledWith(req)
    expect(payloadBoundary.commitTransaction).not.toHaveBeenCalled()
  })

  it('uses a fresh request for every stage', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
      find: vi.fn(),
    }
    const firstReq = {
      context: { disableRevalidate: true, seed: true },
      payload,
      transactionID: 'transaction-1',
    }
    const secondReq = {
      context: { disableRevalidate: true, seed: true },
      payload,
      transactionID: 'transaction-2',
    }
    payloadBoundary.createLocalReq.mockResolvedValueOnce(firstReq).mockResolvedValueOnce(secondReq)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    const result = await runSeed(payload as never, {
      stages: [
        {
          name: 'bootstrap-admin',
          run: async ({ req }) => {
            expect(client.release).not.toHaveBeenCalled()
            expect(req).toBe(firstReq)
            return { conflict: 0, created: 1, skipped: 0, updated: 0 }
          },
        },
        {
          name: 'categories',
          run: async ({ req }) => {
            expect(req).toBe(secondReq)
            expect(req.context).not.toHaveProperty('allowUnauthenticatedBootstrap')
            return { conflict: 0, created: 2, skipped: 1, updated: 0 }
          },
        },
      ],
    })

    expect(result).toMatchObject({ conflict: 0, created: 3, skipped: 1, updated: 0 })
    expect(payloadBoundary.commitTransaction).toHaveBeenCalledTimes(2)
    expect(payloadBoundary.killTransaction).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalledOnce()
  })
})
