import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@payload-config'
import { ensureSystemRolesAndSuperAdmin } from '@/bootstrap/ensure-system-roles-and-super-admin'
import { roleFixtures } from '@/seed/fixtures/roles'

// Must match BOOTSTRAP_LOCK_ID in ensure-system-roles-and-super-admin.ts.
const BOOTSTRAP_LOCK_ID = 1_095_783_765

/**
 * Concurrency coverage for the identity bootstrap against a REAL PostgreSQL.
 *
 * The unit suite proves the lock is requested and released using a mocked
 * pool, which cannot show whether the advisory lock actually serialises
 * anything. Only a real server can: `pg_advisory_lock` is enforced by the
 * database, and duplicate Roles/users are prevented by real unique indexes.
 *
 * This is the case a rolling container replacement produces — two app
 * instances initializing against one database at the same time.
 */

const CANONICAL_SLUGS = [...roleFixtures.map((fixture) => fixture.shared.slug)].sort()
const BOOTSTRAP_EMAIL = 'concurrency-admin@aau.test'

let payload: Payload

beforeAll(async () => {
  process.env.INITIAL_ADMIN_EMAIL = BOOTSTRAP_EMAIL
  process.env.INITIAL_ADMIN_PASSWORD = 'Concurrency-Bootstrap-2026!'
  payload = await getPayload({ config })
}, 120_000)

afterAll(async () => {
  await payload?.destroy?.()
})

async function roleSlugs(): Promise<string[]> {
  const result = await payload.find({
    collection: 'roles',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    pagination: false,
  })
  return result.docs.map((role) => role.slug as string).sort()
}

async function bootstrapUsers() {
  return payload.find({
    collection: 'users',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: BOOTSTRAP_EMAIL } },
  })
}

describe('identity bootstrap concurrency against real PostgreSQL', () => {
  it('serialises overlapping initializers without creating duplicates', async () => {
    // Four simultaneous starts, as a rolling replacement would produce. All
    // must succeed; the advisory lock decides who creates and who validates.
    const results = await Promise.all(
      Array.from({ length: 4 }, () => ensureSystemRolesAndSuperAdmin(payload)),
    )

    expect(results).toHaveLength(4)

    // Exactly one initializer may create each Role; the rest observe it.
    const created = results.flatMap((result) => result.rolesCreated)
    for (const slug of CANONICAL_SLUGS) {
      expect(
        created.filter((candidate) => candidate === slug).length,
        `${slug} must be created at most once across concurrent starts`,
      ).toBeLessThanOrEqual(1)
    }

    // Exactly one initializer may create the account.
    expect(results.filter((result) => result.superAdmin === 'created').length).toBeLessThanOrEqual(1)

    expect(await roleSlugs()).toEqual(CANONICAL_SLUGS)
    expect((await bootstrapUsers()).totalDocs).toBe(1)
  }, 120_000)

  it('is a pure no-op once the database is already bootstrapped', async () => {
    const before = await payload.findByID({
      collection: 'users',
      id: (await bootstrapUsers()).docs[0].id,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })

    const result = await ensureSystemRolesAndSuperAdmin(payload)

    expect(result.rolesCreated).toEqual([])
    expect(result.rolesExisting.sort()).toEqual(CANONICAL_SLUGS)
    expect(result.superAdmin).toBe('validated')

    const after = await payload.findByID({
      collection: 'users',
      id: before.id,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })

    // The password hash and the row's updatedAt must both be untouched: a
    // restart is not allowed to rewrite production identity state.
    expect((after as { hash?: string }).hash).toBe((before as { hash?: string }).hash)
    expect(after.updatedAt).toBe(before.updatedAt)
  }, 120_000)

  it('refuses when the checked-out backend ALREADY holds the lock (pooler reentrancy)', async () => {
    // PostgreSQL session-level advisory locks are re-entrant: a session that
    // already holds a key acquires it again and merely increments the count.
    // So "pg_try_advisory_lock returned true" does not prove exclusivity — it
    // proves it only for a session nobody else is sharing. A transaction
    // pooler can hand a second run the very backend that holds the lock, and
    // both would proceed.
    //
    // This reproduces that against a real server by taking the lock on a
    // client and then handing the SAME client to the bootstrap, which is
    // exactly what a pooler's reuse looks like from the caller's side.
    const pool = (
      payload.db as {
        pool?: {
          connect: () => Promise<{
            query: (sql: string, values?: unknown[]) => Promise<{ rows: unknown[] }>
            release: (destroy?: boolean) => void
          }>
        }
      }
    ).pool
    const client = await pool!.connect()

    try {
      // First, confirm the premise on this server rather than assuming it.
      const first = await client.query('SELECT pg_try_advisory_lock($1) AS a', [BOOTSTRAP_LOCK_ID])
      expect((first.rows[0] as { a: boolean }).a).toBe(true)
      const second = await client.query('SELECT pg_try_advisory_lock($1) AS a', [BOOTSTRAP_LOCK_ID])
      expect(
        (second.rows[0] as { a: boolean }).a,
        'session-level advisory locks must be re-entrant for this test to mean anything',
      ).toBe(true)

      // And one unlock is not enough to give it back.
      await client.query('SELECT pg_advisory_unlock($1)', [BOOTSTRAP_LOCK_ID])
      const stillHeld = await client.query(
        `SELECT count(*)::int AS held FROM pg_locks
          WHERE locktype = 'advisory' AND pid = pg_backend_pid()
            AND classid = ($1::bigint >> 32)::int
            AND objid = ($1::bigint & x'FFFFFFFF'::bigint)::int`,
        [BOOTSTRAP_LOCK_ID],
      )
      expect((stillHeld.rows[0] as { held: number }).held).toBe(1)

      // Now hand THAT backend to the bootstrap, which is what a transaction
      // pooler's reuse looks like from the caller's side.
      //
      // Re-running the probe query here instead would assert nothing about the
      // production code: it would only prove that the same SELECT returns the
      // same row twice, and it stayed green with the guard deleted. The call
      // below is the assertion — the guard has to reject this connection and
      // destroy it, and if it is removed `pg_advisory_lock` returns
      // immediately on a session that already holds the key and the bootstrap
      // runs, which fails this expectation.
      let releasedWithDestroy: boolean | undefined
      const sharedBackend = {
        query: (sql: string, values?: unknown[]) => client.query(sql, values),
        release: (destroy?: boolean) => {
          releasedWithDestroy = destroy
        },
      }
      // Object.create, not a spread: `db` carries prototype methods the
      // bootstrap may reach for, and only `pool` is being substituted.
      const pooledPayload = Object.create(payload as object, {
        db: {
          value: Object.create(payload.db as object, {
            pool: { value: { connect: async () => sharedBackend } },
          }),
        },
      }) as Payload

      await expect(
        ensureSystemRolesAndSuperAdmin(pooledPayload),
        'the bootstrap must refuse a backend that already holds its lock',
      ).rejects.toThrow(/already held by this database session/)

      expect(
        releasedWithDestroy,
        'a connection that is not session-isolated must be destroyed, not returned to the pool',
      ).toBe(true)
    } finally {
      // Destroy the connection so the leaked hold cannot affect later tests.
      client.release(true)
    }
  }, 120_000)

  it('releases the advisory lock so a later start is not blocked', async () => {
    // If the lock leaked, this call would hang until the test timeout.
    await expect(ensureSystemRolesAndSuperAdmin(payload)).resolves.toMatchObject({
      superAdmin: 'validated',
    })

    const pool = (payload.db as { pool?: { query: (sql: string) => Promise<{ rows: unknown[] }> } })
      .pool
    // Filtered by THIS key: an unrelated advisory lock held by another
    // integration worker or client on the same server would otherwise fail
    // this assertion for a reason that has nothing to do with the bootstrap.
    const held = await pool!.query(
      `SELECT count(*)::int AS held FROM pg_locks
        WHERE locktype = 'advisory'
          AND classid = (${BOOTSTRAP_LOCK_ID}::bigint >> 32)::int
          AND objid = (${BOOTSTRAP_LOCK_ID}::bigint & x'FFFFFFFF'::bigint)::int`,
    )
    expect((held.rows[0] as { held: number }).held).toBe(0)
  }, 120_000)
})
