import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  commitTransaction: vi.fn(),
  createLocalReq: vi.fn(),
  initTransaction: vi.fn(),
  killTransaction: vi.fn(),
}))

vi.mock('payload', () => ({
  commitTransaction: mocks.commitTransaction,
  createLocalReq: mocks.createLocalReq,
  initTransaction: mocks.initTransaction,
  killTransaction: mocks.killTransaction,
}))

import {
  BootstrapConfigurationError,
  BootstrapStateError,
  assertBootstrapPasswordStrength,
  ensureSystemRolesAndSuperAdmin,
} from '../ensure-system-roles-and-super-admin'
import { roleFixtures } from '@/bootstrap/role-fixtures'

const CANONICAL_SLUGS = ['super_admin', 'admin', 'content_manager', 'coordinator', 'student', 'doctor']

const SUPER_ADMIN_PERMISSIONS = roleFixtures
  .find((fixture) => fixture.shared.slug === 'super_admin')!
  .shared.permissions.map(({ key }) => key)

interface FakeRole {
  id: number
  slug: string
  isActive: boolean
  canAccessPayloadAdmin: boolean
  isSystemRole: boolean
  permissions: { key: string }[]
  level: number
}

interface FakeUser {
  id: number
  email: string
  isActive: boolean
  role: number
  roleSlug: string
  roleLevel: number
  systemRole: string
  roleIsActive: boolean
  roleCanAccessPayloadAdmin: boolean
  rolePermissions: string[]
}

interface FindArgs {
  collection: string
  where: { email: { equals: string }; slug: { equals: string } }
}

interface WriteArgs {
  collection: string
  context?: Record<string, unknown>
  data: Record<string, unknown>
  id?: number
  locale?: string
}

/**
 * Minimal in-memory Payload double. It models only what the bootstrap
 * touches: `roles`/`users` find + create + update, and a session-capable pool
 * for the advisory lock.
 */
function createPayloadDouble(options: { roles?: FakeRole[]; users?: FakeUser[] } = {}) {
  const roles: FakeRole[] = options.roles ? [...options.roles] : []
  const users: FakeUser[] = options.users ? [...options.users] : []
  const queries: string[] = []
  let nextId = 100

  const createdRoleLocales: Record<string, string[]> = {}

  const payload = {
    db: {
      pool: {
        connect: async () => ({
          query: async (text: string) => {
            queries.push(text)
            // The reentrancy probe reads pg_locks and must answer with a real
            // count: the guard fails closed, so "could not read" is not "zero".
            // Answering 0 here is the honest double for a fresh backend.
            if (text.includes('pg_locks')) return { rows: [{ held: 0 }] }
            return { rows: [{}] }
          },
          release: () => {},
        }),
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    find: vi.fn(async ({ collection, where }: FindArgs) => {
      if (collection === 'roles') {
        const slug = where.slug.equals
        const doc = roles.find((role) => role.slug === slug)
        return { docs: doc ? [doc] : [] }
      }
      const email = where.email.equals
      const doc = users.find((user) => user.email === email)
      return { docs: doc ? [doc] : [] }
    }),
    create: vi.fn(async ({ collection, data, locale }: WriteArgs) => {
      const fields = data as unknown as FakeRole & FakeUser
      if (collection === 'roles') {
        const role: FakeRole = { ...fields, id: (nextId += 1) }
        roles.push(role)
        createdRoleLocales[fields.slug] = [locale as string]
        return role
      }
      const role = roles.find((candidate) => candidate.id === fields.role)!
      const user: FakeUser = {
        id: (nextId += 1),
        email: fields.email,
        isActive: fields.isActive,
        role: fields.role,
        roleSlug: role.slug,
        roleLevel: role.level,
        systemRole: fields.systemRole,
        roleIsActive: role.isActive,
        roleCanAccessPayloadAdmin: role.canAccessPayloadAdmin,
        rolePermissions: role.permissions.map(({ key }) => key),
      }
      users.push(user)
      return user
    }),
    update: vi.fn(async ({ collection, id, locale }: WriteArgs) => {
      const role = roles.find((candidate) => candidate.id === id)!
      if (collection === 'roles') createdRoleLocales[role.slug].push(locale as string)
      return role
    }),
  }

  return { payload, roles, users, queries, createdRoleLocales }
}

function superAdminRole(overrides: Partial<FakeRole> = {}): FakeRole {
  return {
    id: 1,
    slug: 'super_admin',
    isActive: true,
    canAccessPayloadAdmin: true,
    isSystemRole: true,
    level: 5,
    permissions: SUPER_ADMIN_PERMISSIONS.map((key) => ({ key })),
    ...overrides,
  }
}

/**
 * A fully bootstrapped Role table. Tests about the *account* seed this so the
 * create-missing-Roles step is already satisfied and cannot be confused with
 * the behaviour under test.
 */
function allCanonicalRoles(superAdminOverrides: Partial<FakeRole> = {}): FakeRole[] {
  return roleFixtures.map((fixture, index) =>
    fixture.shared.slug === 'super_admin'
      ? superAdminRole(superAdminOverrides)
      : {
          id: index + 10,
          slug: fixture.shared.slug,
          isActive: fixture.shared.isActive,
          canAccessPayloadAdmin: fixture.shared.canAccessPayloadAdmin,
          isSystemRole: fixture.shared.isSystemRole,
          level: fixture.shared.level,
          permissions: fixture.shared.permissions.map(({ key }) => ({ key })),
        },
  )
}

function existingSuperAdminUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 50,
    email: 'admin@aau.example',
    isActive: true,
    role: 1,
    roleSlug: 'super_admin',
    systemRole: 'super_admin',
    roleLevel: 5,
    roleIsActive: true,
    roleCanAccessPayloadAdmin: true,
    rolePermissions: [...SUPER_ADMIN_PERMISSIONS],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createLocalReq.mockImplementation(async () => ({ context: {} }))
  mocks.initTransaction.mockResolvedValue(true)
  mocks.commitTransaction.mockResolvedValue(undefined)
  mocks.killTransaction.mockResolvedValue(undefined)
  process.env.INITIAL_ADMIN_EMAIL = 'admin@aau.example'
  process.env.INITIAL_ADMIN_PASSWORD = 'Bootstrap-Password-2026!'
})

describe('fresh database', () => {
  it('creates every canonical Role from the current fixtures and the Super Admin', async () => {
    const { payload, roles, users, createdRoleLocales } = createPayloadDouble()

    const result = await ensureSystemRolesAndSuperAdmin(payload as never)

    expect(result.rolesCreated).toEqual(CANONICAL_SLUGS)
    expect(result.rolesExisting).toEqual([])
    expect(result.superAdmin).toBe('created')
    expect(roles.map((role) => role.slug).sort()).toEqual([...CANONICAL_SLUGS].sort())

    // Both configured locales are written for every newly created Role.
    for (const slug of CANONICAL_SLUGS) {
      expect(createdRoleLocales[slug]).toEqual(['ar', 'en'])
    }

    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      email: 'admin@aau.example',
      isActive: true,
      systemRole: 'super_admin',
    })
  })

  it('creates the Super Admin through the explicit bootstrap hook contract', async () => {
    const { payload } = createPayloadDouble()

    await ensureSystemRolesAndSuperAdmin(payload as never)

    const userCreate = payload.create.mock.calls.find(([args]) => args.collection === 'users')!
    expect(userCreate[0].context).toEqual({ allowUnauthenticatedBootstrap: true })
  })

  it('never creates ordinary users or any broad Seed content', async () => {
    const { payload } = createPayloadDouble()

    await ensureSystemRolesAndSuperAdmin(payload as never)

    const touched = new Set(payload.create.mock.calls.map(([args]) => args.collection))
    expect([...touched].sort()).toEqual(['roles', 'users'])
    expect(payload.create.mock.calls.filter(([a]) => a.collection === 'users')).toHaveLength(1)
  })

  it('fails closed when the account is missing and no bootstrap password is configured', async () => {
    delete process.env.INITIAL_ADMIN_PASSWORD
    const { payload } = createPayloadDouble()

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(
      BootstrapConfigurationError,
    )
    expect(mocks.killTransaction).toHaveBeenCalled()
  })

  it('fails closed when INITIAL_ADMIN_EMAIL is missing', async () => {
    delete process.env.INITIAL_ADMIN_EMAIL
    const { payload } = createPayloadDouble()

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(
      /INITIAL_ADMIN_EMAIL must be set/,
    )
  })

  it('rejects a weak bootstrap password', async () => {
    process.env.INITIAL_ADMIN_PASSWORD = 'short'
    const { payload } = createPayloadDouble()

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(
      /at least 12 characters/,
    )
  })
})

describe('restart against an already-bootstrapped database', () => {
  it('is a no-op: no Role is overwritten and no password is reset', async () => {
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles(),
      users: [existingSuperAdminUser()],
    })

    const result = await ensureSystemRolesAndSuperAdmin(payload as never)

    expect(result.rolesCreated).toEqual([])
    expect(result.rolesExisting).toEqual(CANONICAL_SLUGS)
    expect(result.superAdmin).toBe('validated')
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('validates an existing Super Admin without needing the bootstrap password', async () => {
    delete process.env.INITIAL_ADMIN_PASSWORD
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles(),
      users: [existingSuperAdminUser()],
    })

    const result = await ensureSystemRolesAndSuperAdmin(payload as never)

    expect(result.superAdmin).toBe('validated')
  })

  it('leaves a drifted non-canonical Role field exactly as stored', async () => {
    // `coordinator.canAccessPayloadAdmin` is `true` in the fixture. An operator
    // who deliberately turned it off must not have that reverted by a restart.
    const drifted = {
      id: 11,
      slug: 'coordinator',
      isActive: true,
      canAccessPayloadAdmin: false,
      isSystemRole: true,
      level: 2,
      permissions: [{ key: 'news.manage' }],
    }
    const seeded = allCanonicalRoles().filter((role) => role.slug !== 'coordinator')
    const { payload, roles } = createPayloadDouble({
      roles: [...seeded, drifted],
      users: [existingSuperAdminUser()],
    })

    await ensureSystemRolesAndSuperAdmin(payload as never)

    expect(roles.find((role) => role.slug === 'coordinator')).toEqual(drifted)
  })
})

describe('incompatible state fails closed', () => {
  it('refuses an inactive super_admin Role instead of repairing it', async () => {
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles({ isActive: false }),
      users: [existingSuperAdminUser()],
    })

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(
      BootstrapStateError,
    )
  })

  it.each([
    ['an inactive account', { isActive: false }, /not active/],
    ['a different attached Role', { role: 999 }, /not attached to the canonical super_admin Role/],
    ['a non-super-admin systemRole', { systemRole: 'student' }, /systemRole is not super_admin/],
    ['a stale permission snapshot', { rolePermissions: ['users.manage'] }, /permission snapshot/],
  ])('refuses to silently escalate %s', async (_label, overrides, message) => {
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles(),
      users: [existingSuperAdminUser(overrides)],
    })

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(message)
    // The account is never touched — no repair, no escalation, no password reset.
    expect(payload.update.mock.calls.filter(([args]) => args.collection === 'users')).toEqual([])
  })
})

describe('canonical super_admin Role invariants (regression)', () => {
  it.each([
    ['a demoted privilege level', { level: 3 }, /level is 3, not the canonical 5/],
    ['a Role no longer marked as a system Role', { isSystemRole: false }, /no longer marked as a system Role/],
    ['an admin-panel lockout', { canAccessPayloadAdmin: false }, /cannot access the admin panel/],
  ])('refuses to run with %s', async (_label, overrides, message) => {
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles(overrides),
      users: [existingSuperAdminUser()],
    })

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(message)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('rejects a stale roleLevel snapshot on the account', async () => {
    // The Role still says 5 but the account's saveToJWT snapshot says 1, so the
    // access layer would treat this "super admin" as the lowest tier.
    const { payload } = createPayloadDouble({
      roles: allCanonicalRoles(),
      users: [existingSuperAdminUser({ roleLevel: 1 })],
    })

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow(
      /role level snapshot is 1, not the Role's 5/,
    )
  })

  it('derives the canonical level from the live fixtures, not a second copy', () => {
    const fixture = roleFixtures.find((entry) => entry.shared.slug === 'super_admin')!
    expect(fixture.shared.level).toBe(5)
    expect(fixture.shared.isSystemRole).toBe(true)
  })
})

describe('concurrency safety', () => {
  it('serializes on a dedicated blocking advisory lock and releases it', async () => {
    const { payload, queries } = createPayloadDouble()

    await ensureSystemRolesAndSuperAdmin(payload as never)

    // The reentrancy probe must come FIRST — it exists to refuse before the
    // lock is taken, because a session-level advisory lock is re-entrant and
    // acquiring one on a backend that already holds it succeeds silently.
    expect(queries[0]).toContain('pg_locks')
    expect(queries[1]).toContain('pg_advisory_lock')
    expect(queries.at(-1)).toContain('pg_advisory_unlock')
  })

  it('releases the lock even when bootstrap fails', async () => {
    delete process.env.INITIAL_ADMIN_EMAIL
    const { payload, queries } = createPayloadDouble()

    await expect(ensureSystemRolesAndSuperAdmin(payload as never)).rejects.toThrow()
    // The credential check runs before the lock is taken, so nothing to release.
    expect(queries).toEqual([])
  })

  it('validates rather than duplicating when a concurrent starter wins the create', async () => {
    const { payload, users } = createPayloadDouble({ roles: allCanonicalRoles() })
    const raced = existingSuperAdminUser()

    payload.create.mockImplementation(async ({ collection }: WriteArgs) => {
      if (collection !== 'users') throw new Error('unexpected create')
      users.push(raced)
      throw Object.assign(new Error('duplicate key'), { code: '23505' })
    })

    const result = await ensureSystemRolesAndSuperAdmin(payload as never)

    expect(result.superAdmin).toBe('validated')
    expect(users).toHaveLength(1)
  })

})

describe('password policy', () => {
  it.each([
    'Bootstrap-Password-2026!',
    'An0ther#StrongPass',
  ])('accepts %s', (password) => {
    expect(() => assertBootstrapPasswordStrength(password)).not.toThrow()
  })

  it.each([
    ['too short', 'Ab1!efgh'],
    ['no uppercase', 'bootstrap-password-2026!'],
    ['no lowercase', 'BOOTSTRAP-PASSWORD-2026!'],
    ['no digit', 'Bootstrap-Password!!!!'],
    ['no special character', 'BootstrapPassword2026'],
  ])('rejects %s', (_label, password) => {
    expect(() => assertBootstrapPasswordStrength(password)).toThrow(BootstrapConfigurationError)
  })
})
