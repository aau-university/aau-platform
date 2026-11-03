import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { Role, User } from '@/payload-types'

import { relationshipId } from '../access/relationship-id'
import { roleFixtures } from './role-fixtures'

/**
 * Minimal production identity bootstrap.
 *
 * This is deliberately *not* the broad canonical Seed. It runs from Payload's
 * `onInit` inside the production container and does exactly two things:
 *
 *   1. creates any canonical system Role from `roleFixtures` that does not
 *      exist yet — existing Roles are never reconciled or overwritten;
 *   2. creates the configured Super Admin account if it is absent, and
 *      otherwise validates it without mutating it.
 *
 * Anything else — ordinary users, colleges, programs, pages, globals,
 * navigation, taxonomy, media — is out of scope by contract. `runSeed`,
 * `rolesStage` and `defaultSeedStages` are never reachable from here, which
 * is asserted by `src/bootstrap/__tests__/seed-isolation.test.ts`.
 *
 * Failure modes are fail-closed, but NOT by propagation — and the difference
 * matters, because it is the whole reason the runner exists.
 *
 * Payload SWALLOWS errors thrown from `onInit`: it logs "Error running onInit
 * function" and then completes initialization normally, so `getPayload()`
 * resolves and `/api/health` answers 200 from the next request onward. That
 * was measured against Payload 3.86.0 with the exact production runner image.
 * A release whose Super Admin bootstrap had failed would therefore pass the
 * health gate and be cut over as if it were good.
 *
 * So the terminal behaviour is supplied by `runIdentityBootstrap` in
 * `identity-bootstrap-runner.ts`, which records the failure for `/api/health`
 * and terminates the process. That module is load-bearing, not a wrapper:
 * removing it restores the swallow. See its header for the measurement.
 */

/**
 * Dedicated PostgreSQL advisory lock ID for the runtime identity bootstrap.
 *
 * The value is unchanged from when a content Seed (lock 1_095_783_764) still
 * existed, so a running bootstrap keeps the same key across this upgrade.
 */
const BOOTSTRAP_LOCK_ID = 1_095_783_765

/**
 * The canonical super_admin fixture, used as the reference for the invariants
 * an existing super_admin Role must still satisfy. Derived from the live
 * fixtures so it cannot drift into a second hard-coded copy.
 */
const SUPER_ADMIN_FIXTURE = roleFixtures.find(
  (fixture) => fixture.shared.slug === 'super_admin',
)!

export class BootstrapConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BootstrapConfigurationError'
  }
}

export class BootstrapStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BootstrapStateError'
  }
}

export interface BootstrapResult {
  rolesCreated: string[]
  rolesExisting: string[]
  superAdmin: 'created' | 'validated'
}

interface LockClient {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  release: (destroy?: boolean) => void
}

interface LockPool {
  connect: () => Promise<LockClient>
}

/**
 * Ensure the canonical system Roles and the configured Super Admin exist.
 *
 * Safe to call on every container start: after the first successful run it is
 * a pure read-only validation.
 */
export async function ensureSystemRolesAndSuperAdmin(payload: Payload): Promise<BootstrapResult> {
  const credentials = readBootstrapCredentials()

  return withBootstrapAdvisoryLock(payload, async () => {
    const req = await createLocalReq({ fallbackLocale: false }, payload)

    const started = await initTransaction(req)
    if (!started) {
      throw new BootstrapStateError('The identity bootstrap could not start a database transaction.')
    }

    try {
      const roleOutcome = await ensureCanonicalRoles(payload, req)
      const superAdminRole = await requireSuperAdminRole(payload, req)
      const superAdmin = await ensureSuperAdminAccount(payload, req, superAdminRole, credentials)

      await commitTransaction(req)

      return { ...roleOutcome, superAdmin }
    } catch (error) {
      await killTransaction(req)
      throw error
    }
  })
}

interface BootstrapCredentials {
  email: string
  password?: string
}

function readBootstrapCredentials(): BootstrapCredentials {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim()
  if (!email) {
    throw new BootstrapConfigurationError(
      'INITIAL_ADMIN_EMAIL must be set when PAYLOAD_RUNTIME_BOOTSTRAP is enabled.',
    )
  }

  // The password is intentionally optional. It is only required when the
  // configured account does not exist yet, so an operator can remove it from
  // the long-lived VPS environment after the first successful bootstrap.
  const password = process.env.INITIAL_ADMIN_PASSWORD
  return password ? { email, password } : { email }
}

// ── Canonical system Roles ────────────────────────────────────────────────

async function ensureCanonicalRoles(
  payload: Payload,
  req: PayloadRequest,
): Promise<{ rolesCreated: string[]; rolesExisting: string[] }> {
  const rolesCreated: string[] = []
  const rolesExisting: string[] = []

  for (const fixture of roleFixtures) {
    const slug = fixture.shared.slug

    if (await findRoleBySlug(payload, req, slug)) {
      // Create-missing-only: an existing canonical Role is left exactly as the
      // database has it. Ordinary container restarts must never rewrite
      // production authorization data — intentional changes go through a
      // reviewed migration or an explicit administrative action.
      rolesExisting.push(slug)
      continue
    }

    await createCanonicalRole(payload, req, fixture)
    rolesCreated.push(slug)
  }

  return { rolesCreated, rolesExisting }
}

async function createCanonicalRole(
  payload: Payload,
  req: PayloadRequest,
  fixture: (typeof roleFixtures)[number],
): Promise<void> {
  // The Roles collection stores `name`/`description` as localized fields, so
  // the canonical document is written once per configured locale. This mirrors
  // how `rolesStage` creates a brand-new Role, without adopting its
  // reconcile-existing behaviour.
  const created = await payload.create({
    collection: 'roles',
    data: {
      ...fixture.shared,
      ...fixture.ar,
      permissions: fixture.shared.permissions.map(({ key }) => ({ key })),
    },
    depth: 0,
    locale: 'ar',
    overrideAccess: true,
    req,
  })

  await payload.update({
    collection: 'roles',
    id: created.id,
    data: { ...fixture.en },
    depth: 0,
    locale: 'en',
    overrideAccess: true,
    req,
  })
}

async function findRoleBySlug(
  payload: Payload,
  req: PayloadRequest,
  slug: string,
): Promise<Role | undefined> {
  const result = await payload.find({
    collection: 'roles',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { slug: { equals: slug } },
  })

  return result.docs[0]
}

async function requireSuperAdminRole(payload: Payload, req: PayloadRequest): Promise<Role> {
  const role = await findRoleBySlug(payload, req, 'super_admin')
  if (!role) {
    throw new BootstrapStateError(
      'The canonical super_admin Role is missing after role bootstrap; refusing to continue.',
    )
  }

  // Validate-only for an existing Role: these are the minimum invariants that
  // make the configured account a usable system administrator. An incompatible
  // Role fails the deployment instead of being silently rewritten.
  const problems: string[] = []

  if (role.isActive !== true) problems.push('it is not active')
  if (role.canAccessPayloadAdmin !== true) problems.push('it cannot access the admin panel')
  if (role.isSystemRole !== true) problems.push('it is no longer marked as a system Role')

  // `level` is the privilege ordering the access layer compares against
  // (`ROLE_LEVELS`, `hasRoleLevelAtLeast`, `assignableRolesFilter`). A
  // super_admin Role demoted below the canonical level would still look
  // "active and admin-enabled" while silently losing the authority the
  // bootstrap account is supposed to have.
  if (role.level !== SUPER_ADMIN_FIXTURE.shared.level) {
    problems.push(
      `its level is ${String(role.level)}, not the canonical ${SUPER_ADMIN_FIXTURE.shared.level}`,
    )
  }

  if (problems.length > 0) {
    throw new BootstrapStateError(
      `The existing super_admin Role is not usable as a system administrator: ${problems.join('; ')}. ` +
        'Repair it deliberately through an administrative change; startup will not rewrite it.',
    )
  }

  return role
}

// ── Configured Super Admin account ────────────────────────────────────────

async function ensureSuperAdminAccount(
  payload: Payload,
  req: PayloadRequest,
  role: Role,
  credentials: BootstrapCredentials,
): Promise<'created' | 'validated'> {
  const existing = await findUserByEmail(payload, req, credentials.email)

  if (existing) {
    // Validate-only. The password and every unrelated profile field are left
    // untouched on every subsequent deploy, restart and host reboot.
    assertUsableSuperAdmin(existing, role, credentials.email)
    return 'validated'
  }

  if (!credentials.password) {
    throw new BootstrapConfigurationError(
      `No user exists for INITIAL_ADMIN_EMAIL (${credentials.email}) and INITIAL_ADMIN_PASSWORD is not set. ` +
        'Provide the bootstrap password for the first launch.',
    )
  }

  assertBootstrapPasswordStrength(credentials.password)

  try {
    await payload.create({
      collection: 'users',
      // `enforceRoleHierarchyHook` fails closed without `req.user`. This is the
      // repository's existing, explicit bootstrap contract for the one account
      // that by definition cannot be created by an already-privileged actor.
      context: { allowUnauthenticatedBootstrap: true },
      data: {
        email: credentials.email,
        firstName: 'Super',
        isActive: true,
        lastName: 'Admin',
        password: credentials.password,
        role: role.id,
        systemRole: 'super_admin',
      },
      depth: 0,
      overrideAccess: true,
      req,
    })
  } catch (error) {
    // Defence in depth against a lost-lock race: `users.email` is unique, so a
    // concurrent initializer that won the create leaves us a valid account to
    // validate rather than a duplicate to reconcile.
    if (!isUniqueViolation(error)) throw error

    const raced = await findUserByEmail(payload, req, credentials.email)
    if (!raced) throw error
    assertUsableSuperAdmin(raced, role, credentials.email)
    return 'validated'
  }

  return 'created'
}

async function findUserByEmail(
  payload: Payload,
  req: PayloadRequest,
  email: string,
): Promise<User | undefined> {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    showHiddenFields: true,
    where: { email: { equals: email } },
  })

  return result.docs[0]
}

/**
 * Minimum invariants for "the configured account is a usable Super Admin".
 *
 * Anything short of this is an operator problem, not something a container
 * restart may repair — silently re-attaching an existing account to the
 * super_admin Role would be a privilege escalation performed by a deploy.
 */
function assertUsableSuperAdmin(user: User, role: Role, email: string): void {
  const problems: string[] = []

  if (user.isActive !== true) problems.push('the account is not active')
  if (String(relationshipId(user.role) ?? '') !== String(role.id)) {
    problems.push('the account is not attached to the canonical super_admin Role')
  }
  if (user.roleSlug !== 'super_admin') problems.push('the role slug snapshot is not super_admin')
  if (user.systemRole !== 'super_admin') problems.push('the systemRole is not super_admin')
  // `roleLevel` is a saveToJWT snapshot the access layer reads directly, so a
  // stale or downgraded value silently reduces the account's authority even
  // while the Role relationship still points at super_admin.
  if (user.roleLevel !== role.level) {
    problems.push(
      `the role level snapshot is ${String(user.roleLevel)}, not the Role's ${String(role.level)}`,
    )
  }
  if (user.roleIsActive !== true) problems.push('the role-active snapshot is stale')
  if (user.roleCanAccessPayloadAdmin !== true) {
    problems.push('the admin-access snapshot is stale')
  }
  if (!samePermissionSet(user.rolePermissions, role.permissions)) {
    problems.push('the permission snapshot does not match the stored super_admin Role')
  }

  if (problems.length > 0) {
    throw new BootstrapStateError(
      `The account configured as INITIAL_ADMIN_EMAIL (${email}) exists but is not a usable Super Admin: ` +
        `${problems.join('; ')}. Startup will not modify it — resolve this deliberately.`,
    )
  }
}

/**
 * Compare snapshot permissions against the stored Role as *sets*.
 *
 * `syncUsersOnRoleChange` writes the snapshot in Role order, so ordered
 * comparison would normally agree — but ordering is an implementation detail
 * of that hook, and treating a reordering as a fatal deployment error would
 * be a false positive. Membership is the property that actually matters.
 */
function samePermissionSet(snapshot: unknown, rolePermissions: Role['permissions']): boolean {
  const actual = new Set(
    Array.isArray(snapshot) ? snapshot.filter((key): key is string => typeof key === 'string') : [],
  )
  const expected = new Set((rolePermissions ?? []).map(({ key }) => key))

  if (actual.size !== expected.size) return false
  for (const key of expected) {
    if (!actual.has(key)) return false
  }
  return true
}

/**
 * Same policy as the existing seed bootstrap stage, kept in one place here so
 * the runtime path cannot drift into accepting a weaker first password.
 */
export function assertBootstrapPasswordStrength(password: string): void {
  const valid =
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)

  if (!valid) {
    throw new BootstrapConfigurationError(
      'INITIAL_ADMIN_PASSWORD must be at least 12 characters and include lowercase, uppercase, numeric, and special characters.',
    )
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  // 23505 = unique_violation. Payload wraps adapter errors, so check the cause
  // chain rather than only the top-level object.
  const candidates = [error, (error as { cause?: unknown }).cause]
  return candidates.some(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { code?: unknown }).code === '23505',
  )
}

// ── Concurrency ───────────────────────────────────────────────────────────

/**
 * Serialize bootstrap across concurrently starting containers.
 *
 * A *blocking* `pg_advisory_lock` is used rather than `pg_try_advisory_lock`:
 * during a rolling replacement the losing container should wait for the
 * winner and then validate the resulting state, not fail its own start.
 */
async function withBootstrapAdvisoryLock<T>(
  payload: Payload,
  run: () => Promise<T>,
): Promise<T> {
  const pool = (payload.db as { pool?: LockPool }).pool
  if (!pool || typeof pool.connect !== 'function') {
    throw new BootstrapStateError(
      'The identity bootstrap requires a direct, session-capable PostgreSQL connection.',
    )
  }

  const client = await pool.connect()
  let healthy = true

  // Session-level advisory locks are RE-ENTRANT, so acquiring one does not by
  // itself prove this process is the only holder: a session that already holds
  // the key acquires it again and simply increments the hold count. On a direct
  // connection nobody else shares the session, but a transaction pooler can
  // hand a second run the backend that already holds it — and `pg_advisory_lock`
  // would return immediately rather than waiting. Measured, not assumed: if
  // this backend already holds the key, pg_locks has a row for it beforehand.
  try {
    const held = await client.query(
      `SELECT count(*)::int AS held
         FROM pg_locks
        WHERE locktype = 'advisory'
          AND pid = pg_backend_pid()
          AND classid = ($1::bigint >> 32)::int
          AND objid = ($1::bigint & x'FFFFFFFF'::bigint)::int`,
      [BOOTSTRAP_LOCK_ID],
    )
    // Fail closed: an unreadable count is not a zero count.
    if (Number(held.rows[0]?.held ?? -1) !== 0) {
      client.release(true)
      throw new BootstrapStateError(
        'The identity bootstrap advisory lock is already held by this database session, ' +
          'so another bootstrap is in progress on it. This connection is not session-isolated: ' +
          'the bootstrap requires a direct, non-pooled PostgreSQL connection.',
      )
    }
  } catch (error) {
    if (error instanceof BootstrapStateError) throw error
    client.release(true)
    throw new BootstrapStateError(
      `The identity bootstrap advisory lock state could not be read: ${describe(error)}`,
    )
  }

  try {
    await client.query('SELECT pg_advisory_lock($1)', [BOOTSTRAP_LOCK_ID])
  } catch (error) {
    client.release(true)
    throw new BootstrapStateError(
      `The identity bootstrap advisory lock could not be acquired: ${describe(error)}`,
    )
  }

  try {
    return await run()
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [BOOTSTRAP_LOCK_ID])
    } catch {
      // The session holds the lock; destroying the connection releases it.
      healthy = false
    }
    client.release(healthy ? undefined : true)
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
