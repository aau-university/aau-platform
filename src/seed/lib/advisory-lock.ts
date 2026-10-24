import type { Payload } from 'payload'

import { resolveDatabaseConnectionString } from '../../lib/database-url'

const SEED_LOCK_ID = 1_095_783_764

interface LockClient {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  release: (destroy?: boolean) => void
}

interface LockPool {
  connect: () => Promise<LockClient>
}

export class SeedAlreadyRunningError extends Error {
  constructor() {
    super('A seed run is already in progress.')
    this.name = 'SeedAlreadyRunningError'
  }
}

export class SeedConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeedConnectionError'
  }
}

export class SeedLockReleaseError extends Error {
  constructor() {
    super('The seed advisory lock could not be confirmed as released.')
    this.name = 'SeedLockReleaseError'
  }
}

export async function withSeedAdvisoryLock<T>(payload: Payload, run: () => Promise<T>): Promise<T> {
  const expectedDatabase = getExpectedDatabase(payload)

  const pool = (payload.db as { pool?: LockPool }).pool
  if (!pool || typeof pool.connect !== 'function') {
    throw new SeedConnectionError(
      'Seed advisory locking requires a direct, session-capable PostgreSQL connection.',
    )
  }

  let client: LockClient
  try {
    client = await pool.connect()
  } catch {
    throw new SeedConnectionError('The seed database connection is unavailable.')
  }
  let destroyConnection = false

  const operationResult = await capture(async () => {
    let identity: { rows: Array<Record<string, unknown>> }
    try {
      identity = await client.query('SELECT current_database() AS database')
    } catch {
      destroyConnection = true
      throw new SeedConnectionError('The seed database connection is unavailable.')
    }
    if (identity.rows[0]?.database !== expectedDatabase) {
      throw new SeedConnectionError(
        'The checked-out PostgreSQL connection does not match the configured database.',
      )
    }

    // ── Reentrancy check, BEFORE acquiring ────────────────────────────
    // PostgreSQL session-level advisory locks are RE-ENTRANT: a session that
    // already holds a key acquires it again successfully and the hold count
    // increments. Measured on a real server:
    //
    //   first  acquire:                true
    //   second acquire (SAME session): true
    //   one unlock returns:            true
    //   still held after ONE unlock:   yes
    //
    // So `pg_try_advisory_lock` returning true does NOT by itself prove this
    // run is the only one. It proves it only for a session nobody else is
    // sharing. That assumption holds on a direct connection — which is what
    // this deployment uses — but `resolveDatabaseConnectionString()` also
    // accepts a plain `DATABASE_URI`, and an unmarked transaction pooler can
    // hand a second run the very backend that already holds the lock. Both
    // runs would then proceed, which is the one thing this lock exists to
    // prevent.
    //
    // The heuristics in `parseDirectConnection` cannot prove pool topology and
    // do not claim to. This can be MEASURED instead: if this backend already
    // holds the key, `pg_locks` has a row for it before we ask. A fresh
    // session has none. `pg_try_advisory_lock(bigint)` records classid = the
    // high 32 bits and objid = the low 32 bits, so the key is matched exactly
    // rather than by counting rows.
    let heldResult: { rows: Array<Record<string, unknown>> }
    try {
      heldResult = await client.query(
        `SELECT count(*)::int AS held
           FROM pg_locks
          WHERE locktype = 'advisory'
            AND pid = pg_backend_pid()
            AND classid = ($1::bigint >> 32)::int
            AND objid = ($1::bigint & x'FFFFFFFF'::bigint)::int`,
        [SEED_LOCK_ID],
      )
    } catch {
      destroyConnection = true
      throw new SeedConnectionError('The seed advisory lock state could not be read.')
    }
    // Fail closed: an unreadable count is not a zero count.
    if (Number(heldResult.rows[0]?.held ?? -1) !== 0) {
      destroyConnection = true
      throw new SeedAlreadyRunningError()
    }

    let lockResult: { rows: Array<Record<string, unknown>> }
    try {
      lockResult = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [SEED_LOCK_ID])
    } catch {
      destroyConnection = true
      throw new SeedConnectionError('The seed advisory lock could not be acquired.')
    }

    if (lockResult.rows[0]?.acquired !== true) throw new SeedAlreadyRunningError()

    const runResult = await capture(run)
    const unlockResult = await capture(async () => {
      const result = await client.query('SELECT pg_advisory_unlock($1) AS released', [SEED_LOCK_ID])
      if (result.rows[0]?.released !== true) throw new SeedLockReleaseError()
    })

    if (!unlockResult.ok) {
      destroyConnection = true
      if (!runResult.ok) {
        throw new AggregateError(
          [runResult.error, unlockResult.error],
          'The seed run and advisory lock release both failed.',
        )
      }
      throw unlockResult.error
    }

    if (!runResult.ok) throw runResult.error
    return runResult.value
  })
  const releaseResult = await capture(async () => {
    if (destroyConnection) {
      client.release(true)
    } else {
      client.release()
    }
  })

  if (!operationResult.ok) throw operationResult.error
  if (!releaseResult.ok) throw releaseResult.error
  return operationResult.value
}

type Captured<T> = { ok: true; value: T } | { error: unknown; ok: false }

async function capture<T>(operation: () => Promise<T>): Promise<Captured<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    return { error, ok: false }
  }
}

function getExpectedDatabase(payload: Payload): string {
  // The trusted connection comes from the SAME resolver the Payload adapter is
  // configured with, so this check keeps working whichever form the deployment
  // uses: a ready-made `DATABASE_DIRECT_URI`/`DATABASE_URI` (local development,
  // CI, the source-build stack) or the discrete `DATABASE_*` variables the VPS
  // profile supplies.
  //
  // Reading `DATABASE_DIRECT_URI` directly used to be the only path, which made
  // the Seed fail with "DATABASE_DIRECT_URI is required" on the very deployment
  // profile it is meant to run on — measured by
  // tests/docker/seed-one-shot-drill.sh.
  //
  // The point of the comparison is unchanged and still worth having: it refuses
  // to take a lock and start writing unless the adapter is demonstrably
  // connected to the database the configuration names.
  const directConnectionString = resolveDatabaseConnectionString()
  if (!directConnectionString) {
    throw new SeedConnectionError(
      'No database connection is configured. Set DATABASE_URI/DATABASE_DIRECT_URI, ' +
        'or the discrete DATABASE_HOST/PORT/NAME/USER/PASSWORD variables.',
    )
  }

  const adapterConnectionString = payload.db.poolOptions?.connectionString
  if (typeof adapterConnectionString !== 'string' || !adapterConnectionString) {
    throw new SeedConnectionError('The Payload PostgreSQL adapter has no connection string.')
  }

  const trustedConnection = parseDirectConnection(directConnectionString)
  const adapterConnection = parseDirectConnection(adapterConnectionString)
  if (adapterConnection.normalized !== trustedConnection.normalized) {
    throw new SeedConnectionError(
      'The Payload PostgreSQL adapter is not connected to the configured database.',
    )
  }

  return adapterConnection.database
}

interface DirectConnectionIdentity {
  database: string
  normalized: string
}

function parseDirectConnection(connectionString: string): DirectConnectionIdentity {
  let connectionUrl: URL
  try {
    connectionUrl = new URL(connectionString)
  } catch {
    throw new SeedConnectionError('The configured seed database connection is invalid.')
  }

  if (connectionUrl.protocol !== 'postgres:' && connectionUrl.protocol !== 'postgresql:') {
    throw new SeedConnectionError('Seed advisory locking requires a PostgreSQL connection.')
  }

  const hostname = connectionUrl.hostname.toLowerCase()
  if (!hostname) {
    throw new SeedConnectionError('The configured PostgreSQL connection has no host.')
  }
  // These are defense-in-depth checks. Only the operator-provided direct URI is
  // the trust assertion; hostname and port heuristics cannot prove pool topology.
  if (hostname.includes('pooler')) {
    throw new SeedConnectionError(
      'A pooler host cannot provide the session-level connection required by seed locking. Configure a direct adapter connection.',
    )
  }
  if (connectionUrl.port === '6543') {
    throw new SeedConnectionError(
      'The configured PostgreSQL port is not allowed for session-level seed locking.',
    )
  }
  const usesPgBouncer = [...connectionUrl.searchParams.entries()].some(
    ([key, value]) => key.toLowerCase() === 'pgbouncer' && value.toLowerCase() === 'true',
  )
  if (usesPgBouncer) {
    throw new SeedConnectionError(
      'The configured PostgreSQL connection is marked for transaction pooling.',
    )
  }

  let database: string
  try {
    database = decodeURIComponent(connectionUrl.pathname.slice(1))
  } catch {
    throw new SeedConnectionError('The configured PostgreSQL database name is invalid.')
  }
  if (!database) {
    throw new SeedConnectionError('The configured PostgreSQL connection has no database name.')
  }

  connectionUrl.protocol = 'postgresql:'
  connectionUrl.searchParams.sort()

  return { database, normalized: connectionUrl.toString() }
}
