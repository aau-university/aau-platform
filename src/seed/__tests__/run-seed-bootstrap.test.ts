import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payloadBoundary = vi.hoisted(() => ({
  commitTransaction: vi.fn(),
  createLocalReq: vi.fn(),
  initTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

vi.mock('payload', () => payloadBoundary)

import { runSeed } from '../run-seed'
import type { SeedStageContext } from '../lib/types'
import {
  directPoolOptions,
  restoreSeedTestEnvironment,
  setupSeedTestEnvironment,
} from './run-seed.test-helpers'

describe('runSeed bootstrap capability', () => {
  let environment: ReturnType<typeof setupSeedTestEnvironment>

  beforeEach(() => {
    environment = setupSeedTestEnvironment()
    vi.resetAllMocks()
  })

  afterEach(() => {
    restoreSeedTestEnvironment(environment)
  })

  it('allows an opted-in stage to create exactly one bootstrap user', async () => {
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
    const create = vi.fn().mockResolvedValue({ id: 1 })
    const payload = {
      create,
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const stageReq = {
      context: { disableRevalidate: true, seed: true },
      payload,
      transactionID: 'transaction-1',
    }
    const bootstrapReq = {
      context: { allowUnauthenticatedBootstrap: true, disableRevalidate: true, seed: true },
      payload,
      transactionID: 'transaction-1',
    }
    payloadBoundary.createLocalReq
      .mockResolvedValueOnce(stageReq)
      .mockResolvedValueOnce(bootstrapReq)
    payloadBoundary.initTransaction.mockResolvedValue(true)
    const args = {
      data: {
        email: 'admin@example.test',
        firstName: 'Seed',
        isActive: true,
        lastName: 'Admin',
        password: process.env.TEST_SEED_PASSWORD as string,
        role: 1,
        systemRole: 'super_admin' as const,
      },
    }

    await runSeed(payload as never, {
      stages: [
        {
          allowBootstrapUser: true,
          name: 'bootstrap-admin',
          run: async ({ createBootstrapUser }) => {
            await createBootstrapUser(args)
            await expect(createBootstrapUser(args)).rejects.toThrow('only once')
            return { conflict: 0, created: 1, skipped: 0, updated: 0 }
          },
        },
      ],
    })

    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users' }))
    expect(bootstrapReq.context).not.toHaveProperty('allowUnauthenticatedBootstrap')
    expect(bootstrapReq).not.toHaveProperty('transactionID')
  })

  it('rejects bootstrap user creation from a stage without opt-in', async () => {
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
    const create = vi.fn()
    const payload = {
      create,
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload, transactionID: 'transaction-1' }
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    await expect(
      runSeed(payload as never, {
        stages: [
          {
            name: 'roles',
            run: async ({ createBootstrapUser }) => {
              await createBootstrapUser({
                data: {
                  email: 'admin@example.test',
                  firstName: 'Seed',
                  isActive: true,
                  lastName: 'Admin',
                  password: process.env.TEST_SEED_PASSWORD as string,
                  role: 1,
                  systemRole: 'super_admin',
                },
              })
              return { conflict: 0, created: 1, skipped: 0, updated: 0 }
            },
          },
        ],
      }),
    ).rejects.toThrow('is not allowed to create a bootstrap user')

    expect(create).not.toHaveBeenCalled()
    expect(payloadBoundary.createLocalReq).toHaveBeenCalledOnce()
  })

  it('invalidates an unused bootstrap capability when its stage finishes', async () => {
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
    const create = vi.fn()
    const payload = {
      create,
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload, transactionID: 'transaction-1' }
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)
    let deferredBootstrapCreate: SeedStageContext['createBootstrapUser'] | undefined

    await runSeed(payload as never, {
      stages: [
        {
          allowBootstrapUser: true,
          name: 'bootstrap-admin',
          run: async ({ createBootstrapUser }) => {
            deferredBootstrapCreate = createBootstrapUser
            return { conflict: 0, created: 0, skipped: 1, updated: 0 }
          },
        },
      ],
    })

    if (!deferredBootstrapCreate) throw new Error('Bootstrap capability was not captured.')
    await expect(
      deferredBootstrapCreate({
        data: {
          email: 'admin@example.test',
          firstName: 'Seed',
          isActive: true,
          lastName: 'Admin',
          password: process.env.TEST_SEED_PASSWORD as string,
          role: 1,
          systemRole: 'super_admin',
        },
      }),
    ).rejects.toThrow('capability is no longer active')
    expect(create).not.toHaveBeenCalled()
  })
})
