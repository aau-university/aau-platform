import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const payloadBoundary = vi.hoisted(() => ({
  commitTransaction: vi.fn(),
  createLocalReq: vi.fn(),
  initTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

vi.mock('payload', () => payloadBoundary)

import { runSeed, SeedAlreadyRunningError, SeedConnectionError } from '../run-seed'
import {
  directPoolOptions,
  restoreSeedTestEnvironment,
  setupSeedTestEnvironment,
} from './run-seed.test-helpers'

describe('runSeed', () => {
  let environment: ReturnType<typeof setupSeedTestEnvironment>

  beforeEach(() => {
    environment = setupSeedTestEnvironment()
    vi.resetAllMocks()
  })

  afterEach(() => {
    restoreSeedTestEnvironment(environment)
  })

  it('rejects before pool checkout when NO database is configured at all', async () => {
    // The trusted connection now comes from the same resolver the Payload
    // adapter is configured with, so `DATABASE_URI` and the discrete
    // `DATABASE_*` variables are both legitimate sources — the VPS profile uses
    // the discrete form, and requiring `DATABASE_DIRECT_URI` specifically made
    // the Seed fail on the only deployment profile it is meant to run on.
    //
    // What must still be refused is a Seed with nothing configured: the lock
    // would otherwise be taken against whatever the adapter happens to hold.
    delete process.env.DATABASE_DIRECT_URI
    delete process.env.DATABASE_URI
    for (const key of [
      'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD',
    ]) {
      delete process.env[key]
    }
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
    const connect = vi.fn().mockResolvedValue(client)
    const payload = {
      db: { pool: { connect }, poolOptions: directPoolOptions },
    }

    await expect(runSeed(payload as never)).rejects.toBeInstanceOf(SeedConnectionError)
    expect(connect).not.toHaveBeenCalled()
  })

  it('accepts the discrete DATABASE_* variables as the trusted connection', async () => {
    // The VPS profile supplies these instead of a URI, so the seed must work
    // with them — the adapter is configured from exactly the same resolver.
    delete process.env.DATABASE_DIRECT_URI
    delete process.env.DATABASE_URI
    process.env.DATABASE_HOST = 'direct.example.test'
    process.env.DATABASE_PORT = '5432'
    process.env.DATABASE_NAME = 'aau'
    process.env.DATABASE_USER = 'direct-user'
    process.env.DATABASE_PASSWORD = 'direct-password'

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
    const connect = vi.fn().mockResolvedValue(client)
    const payload = {
      db: {
        pool: { connect },
        poolOptions: {
          connectionString: 'postgresql://direct-user:direct-password@direct.example.test:5432/aau',
        },
      },
    }

    await expect(runSeed(payload as never, { stages: [] })).resolves.toBeDefined()
    expect(connect).toHaveBeenCalled()
  })

  it('rejects before pool checkout when the adapter differs from the configured database', async () => {
    process.env.DATABASE_DIRECT_URI =
      'postgresql://trusted-user:trusted-password@trusted.example.test/aau'
    const connect = vi.fn()
    const payload = {
      db: {
        pool: { connect },
        poolOptions: {
          connectionString: 'postgresql://adapter-user:adapter-password@adapter.example.test/aau',
        },
      },
    }

    let thrown: unknown
    try {
      await runSeed(payload as never, { stages: [] })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(SeedConnectionError)
    expect((thrown as Error).message).not.toContain('trusted-password')
    expect((thrown as Error).message).not.toContain('adapter-password')
    expect(connect).not.toHaveBeenCalled()
  })

  it.each([
    { connectionString: 'postgresql://seed.example.test:6543/aau', name: 'transaction pool port' },
    { connectionString: 'postgresql://pooler-direct.example.test/aau', name: 'pooler hostname' },
    {
      connectionString: 'postgresql://seed.example.test/aau?pgbouncer=true',
      name: 'pgbouncer marker',
    },
    { connectionString: 'mysql://seed.example.test/aau', name: 'non-PostgreSQL scheme' },
  ])('rejects $name before pool checkout', async ({ connectionString }) => {
    process.env.DATABASE_DIRECT_URI = connectionString
    const connect = vi.fn()
    const payload = {
      db: { pool: { connect }, poolOptions: { connectionString } },
    }

    await expect(runSeed(payload as never)).rejects.toBeInstanceOf(SeedConnectionError)
    expect(connect).not.toHaveBeenCalled()
  })

  it('refuses when the checked-out backend ALREADY holds the lock', async () => {
    // Session-level advisory locks are RE-ENTRANT: pg_try_advisory_lock returns
    // true for a session that already holds the key. So a transaction pooler
    // that hands a second run the backend holding the lock would let both
    // proceed — acquisition alone is not proof of exclusivity. The probe runs
    // first and refuses, so pg_try_advisory_lock is never even reached.
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        .mockResolvedValueOnce({ rows: [{ held: 1 }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const stage = vi.fn()

    await expect(
      runSeed(payload as never, { stages: [{ name: 'content', run: stage }] }),
    ).rejects.toBeInstanceOf(SeedAlreadyRunningError)

    expect(stage).not.toHaveBeenCalled()
    // Never asked for the lock, and the reused connection is destroyed rather
    // than returned to a pool that would hand it out again.
    expect(client.query.mock.calls.map(([sql]) => sql).join('\n')).not.toContain(
      'pg_try_advisory_lock',
    )
    expect(client.release).toHaveBeenCalledWith(true)
  })

  it('refuses when the lock state cannot be read at all', async () => {
    // "Could not observe" must not read as "observed free".
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const stage = vi.fn()

    await expect(
      runSeed(payload as never, { stages: [{ name: 'content', run: stage }] }),
    ).rejects.toBeInstanceOf(SeedAlreadyRunningError)
    expect(stage).not.toHaveBeenCalled()
  })

  it('rejects immediately when another seed session holds the advisory lock', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: false }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const stage = vi.fn()

    await expect(
      runSeed(payload as never, {
        stages: [{ name: 'roles', run: stage }],
      }),
    ).rejects.toBeInstanceOf(SeedAlreadyRunningError)

    expect(stage).not.toHaveBeenCalled()
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('normalizes pool checkout failures as connection errors', async () => {
    const payload = {
      db: {
        pool: { connect: vi.fn().mockRejectedValue(new Error('private transport failure')) },
        poolOptions: directPoolOptions,
      },
    }

    await expect(runSeed(payload as never, { stages: [] })).rejects.toBeInstanceOf(
      SeedConnectionError,
    )
  })

  it.each(['identity', 'lock'])('normalizes %s query transport failures', async (failurePoint) => {
    const query = vi.fn()
    if (failurePoint === 'identity') {
      query.mockRejectedValueOnce(new Error('private identity transport failure'))
    } else {
      query
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockRejectedValueOnce(new Error('private lock transport failure'))
    }
    const client = { query, release: vi.fn() }
    const payload = {
      db: {
        pool: { connect: vi.fn().mockResolvedValue(client) },
        poolOptions: directPoolOptions,
      },
    }

    await expect(runSeed(payload as never, { stages: [] })).rejects.toBeInstanceOf(
      SeedConnectionError,
    )
    expect(client.release).toHaveBeenCalledWith(true)
  })

  it('rejects a configured pooler host without exposing its URI', async () => {
    const connect = vi.fn()
    const uri = 'postgresql://secret-user:secret-password@project-pooler.example.test/aau'
    const payload = { db: { pool: { connect }, poolOptions: { connectionString: uri } } }

    let thrown: unknown
    try {
      await runSeed(payload as never, { stages: [] })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(SeedConnectionError)
    expect((thrown as Error).message).not.toContain(uri)
    expect((thrown as Error).message).not.toContain('secret-password')
    expect(connect).not.toHaveBeenCalled()
  })

  it('cannot use a caller-supplied URI to bless a pooled adapter connection', async () => {
    const client = {
      query: vi.fn(),
      release: vi.fn(),
    }
    const connect = vi.fn().mockResolvedValue(client)
    const payload = {
      db: {
        pool: { connect },
        poolOptions: {
          connectionString: 'postgresql://actual:secret@project-pooler.example.test/actual_db',
        },
      },
    }
    const untrustedOptions = {
      directDatabaseUri: 'postgresql://fake.example.test/actual_db',
      stages: [],
    }

    await expect(runSeed(payload as never, untrustedOptions)).rejects.toBeInstanceOf(
      SeedConnectionError,
    )

    expect(connect).not.toHaveBeenCalled()
  })

  it('rejects when the checked-out client belongs to a different database', async () => {
    const client = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ database: 'other_database' }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const untrustedOptions = {
      directDatabaseUri: 'postgresql://fake.example.test/other_database',
      stages: [],
    }

    await expect(runSeed(payload as never, untrustedOptions)).rejects.toBeInstanceOf(
      SeedConnectionError,
    )

    expect(client.query).toHaveBeenCalledOnce()
    expect(client.release).toHaveBeenCalledWith()
  })

  it('destroys the checked-out connection and preserves an advisory unlock error', async () => {
    const unlockError = new Error('advisory unlock failed')
    const releaseError = new Error('connection destruction failed')
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockRejectedValueOnce(unlockError),
      release: vi.fn(() => {
        throw releaseError
      }),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }

    let thrown: unknown
    try {
      await runSeed(payload as never, { stages: [] })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(unlockError)
    expect(client.release).toHaveBeenCalledOnce()
    expect(client.release).toHaveBeenCalledWith(true)
  })

  it('destroys the connection when advisory unlock does not confirm release', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: false }] }),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }

    await expect(runSeed(payload as never, { stages: [] })).rejects.toThrow(
      'advisory lock could not be confirmed as released',
    )
    expect(client.release).toHaveBeenCalledWith(true)
  })

  it('preserves both stage and unlock failures in an AggregateError', async () => {
    const stageError = new Error('stage failed')
    const unlockError = new Error('unlock failed')
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ database: 'aau' }] })
        // The reentrancy probe: this backend does not already hold the lock.
        .mockResolvedValueOnce({ rows: [{ held: 0 }] })
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockRejectedValueOnce(unlockError),
      release: vi.fn(),
    }
    const payload = {
      db: { pool: { connect: vi.fn().mockResolvedValue(client) }, poolOptions: directPoolOptions },
    }
    const req = { payload }
    payloadBoundary.createLocalReq.mockResolvedValue(req)
    payloadBoundary.initTransaction.mockResolvedValue(true)

    let thrown: unknown
    try {
      await runSeed(payload as never, {
        stages: [{ name: 'roles', run: async () => Promise.reject(stageError) }],
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AggregateError)
    expect((thrown as AggregateError).errors).toEqual([stageError, unlockError])
    expect(client.release).toHaveBeenCalledWith(true)
  })
})
