/**
 * Integration-style tests for the enforceRoleHierarchyHook itself.
 *
 * These tests prove the hook's behavior end-to-end with a mocked Payload
 * client. They specifically cover the bug we fixed in this stabilization
 * pass: the original implementation did NOT handle numeric role IDs, so
 * an admin who PATCH'd `{ role: 5 }` (the super_admin role ID) could
 * silently escalate themselves because the hook's level resolver returned
 * undefined and the hook then returned `data` unchanged.
 *
 * Test ordering: degenerate / denial / escalation-attempt first, happy
 * path last (PDCA testing discipline preserved from prior commits).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { enforceRoleHierarchyHook } from '../enforceRoleHierarchy'

type FakeUser = Record<string, unknown>

/**
 * Build a minimal mocked Payload client. `roles[id]` becomes the response
 * for `findByID('roles', id)`. `usersForCount` controls the result of
 * `find('users', { role: superAdminRoleId, isActive: true, ... })`.
 */
function makePayload({
  roles = {} as Record<string | number, { slug?: string; level?: number; id?: string | number }>,
  superAdminRoleId = 1,
  activeSuperAdmins = 1,
}: {
  roles?: Record<string | number, { slug?: string; level?: number; id?: string | number }>
  superAdminRoleId?: string | number
  activeSuperAdmins?: number
} = {}) {
  const findByID = vi.fn(async ({ id }: { id: string | number }) => {
    const doc = roles[id]
    if (!doc) throw new Error(`role ${id} not found`)
    return { id: doc.id ?? id, slug: doc.slug, level: doc.level }
  })

  const find = vi.fn(async ({ collection, where }: { collection: string; where: unknown }) => {
    if (collection === 'roles') {
      // Look up the super_admin role by slug
      return { docs: [{ id: superAdminRoleId }], totalDocs: 1 }
    }
    if (collection === 'users') {
      return { docs: [], totalDocs: activeSuperAdmins, where }
    }
    return { docs: [], totalDocs: 0 }
  })

  return {
    findByID,
    find,
    logger: { warn: vi.fn() },
  }
}

function runHook(args: {
  data: Record<string, unknown>
  user: FakeUser | null
  originalDoc?: Record<string, unknown>
  operation: 'create' | 'update'
  payload?: ReturnType<typeof makePayload>
  context?: Record<string, unknown>
}) {
  const payload = args.payload ?? makePayload()
  const user = args.user
  const normalizedUser = user && typeof user === 'object' && user.role && typeof user.role === 'object'
    ? {
        ...user,
        role: {
          isActive: true,
          ...(user.role as Record<string, unknown>),
        },
      }
    : user
  // The hook accepts a partial of Payload's actual hook args; we satisfy
  // exactly what enforceRoleHierarchyHook actually reads.
  return (enforceRoleHierarchyHook as unknown as (a: unknown) => Promise<unknown>)({
    data: args.data,
    req: { user: normalizedUser, payload, payload_logger: payload.logger },
    originalDoc: args.originalDoc,
    operation: args.operation,
    collection: { slug: 'users' },
    context: args.context ?? {},
  })
}

describe('enforceRoleHierarchyHook — numeric/string ID resolution', () => {
  // ── Bug regression: numeric ID escalation ─────────────────────────────
  it('rejects when admin tries to assign the super_admin role by numeric ID', async () => {
    const payload = makePayload({
      roles: {
        99: { slug: 'super_admin', level: 5 },
      },
    })
    await expect(
      runHook({
        data: { role: 99 }, // numeric ID
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-2' },
        payload,
      }),
    ).rejects.toThrow(/permission to assign this role/i)
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'roles', id: 99 }),
    )
  })

  it('rejects when admin tries to assign super_admin role by string ID', async () => {
    const payload = makePayload({
      roles: {
        'role-super': { slug: 'super_admin', level: 5 },
      },
    })
    await expect(
      runHook({
        data: { role: 'role-super' },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-2' },
        payload,
      }),
    ).rejects.toThrow(/permission to assign this role/i)
  })

  it('allows admin to assign a coordinator role by numeric ID with collegeScope', async () => {
    const payload = makePayload({
      roles: {
        7: { slug: 'coordinator', level: 2 },
      },
    })
    const result = await runHook({
      data: { role: 7, collegeScope: 12 },
      user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
      operation: 'update',
      originalDoc: { id: 'u-2' },
      payload,
    })
    expect(result).toMatchObject({ role: 7, collegeScope: 12 })
  })

  it('rejects assigning coordinator role without collegeScope', async () => {
    const payload = makePayload({
      roles: {
        7: { slug: 'coordinator', level: 2 },
      },
    })
    await expect(
      runHook({
        data: { role: 7 },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-2' },
        payload,
      }),
    ).rejects.toThrow(/collegeScope/i)
  })

  it('allows deactivating an existing coordinator even when collegeScope is missing', async () => {
    const result = await runHook({
      data: { isActive: false },
      user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
      operation: 'update',
      originalDoc: { id: 'u-2', roleSlug: 'coordinator', isActive: true },
    })
    expect(result).toMatchObject({ isActive: false })
  })

  it('rejects when the role ID does not exist (cannot resolve target level)', async () => {
    const payload = makePayload() // empty roles map
    await expect(
      runHook({
        data: { role: 42 },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-2' },
        payload,
      }),
    ).rejects.toThrow(/refusing mutation/i)
  })
})

describe('enforceRoleHierarchyHook — self-protection', () => {
  it('rejects an admin trying to change their own role', async () => {
    const payload = makePayload({ roles: { 4: { slug: 'admin', level: 4 } } })
    await expect(
      runHook({
        data: { role: 4 },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-1', role: 3 },
        payload,
      }),
    ).rejects.toThrow(/modify your own role/i)
  })

  it('rejects an admin trying to deactivate themselves', async () => {
    await expect(
      runHook({
        data: { isActive: false },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-1', isActive: true },
      }),
    ).rejects.toThrow(/modify your own isActive/i)
  })

  it('rejects an admin trying to change their own systemRole', async () => {
    await expect(
      runHook({
        data: { systemRole: 'super_admin' },
        user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-1', systemRole: 'admin' },
      }),
    ).rejects.toThrow(/modify your own systemRole/i)
  })
})

describe('enforceRoleHierarchyHook — inactive actor protection', () => {
  it.each([
    ['role mutation', { role: 4 }],
    ['systemRole mutation', { systemRole: 'admin' }],
    ['collegeScope mutation', { collegeScope: 12 }],
    ['isActive mutation', { isActive: false }],
  ])('rejects inactive users attempting %s', async (_label, data) => {
    await expect(
      runHook({
        data,
        user: { id: 'u-actor', isActive: false, role: { slug: 'super_admin', level: 5 } },
        operation: 'update',
        originalDoc: { id: 'u-victim', isActive: true },
      }),
    ).rejects.toThrow(/inactive users or roles/i)
  })

  it('rejects users with an inactive role snapshot', async () => {
    await expect(
      runHook({
        data: { role: 4 },
        user: { id: 'u-actor', isActive: true, roleSlug: 'super_admin', roleLevel: 5, roleIsActive: false },
        operation: 'update',
        originalDoc: { id: 'u-victim' },
      }),
    ).rejects.toThrow(/inactive users or roles/i)
  })

  it('rejects users with an inactive populated role', async () => {
    await expect(
      runHook({
        data: { systemRole: 'admin' },
        user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: false } },
        operation: 'update',
        originalDoc: { id: 'u-victim' },
      }),
    ).rejects.toThrow(/inactive users or roles/i)
  })
})

describe('enforceRoleHierarchyHook — last super_admin protection', () => {
  it('rejects demoting the only active super_admin', async () => {
    const payload = makePayload({
      roles: {
        4: { slug: 'admin', level: 4 },
      },
      superAdminRoleId: 5,
      activeSuperAdmins: 0, // 0 OTHER active super-admins
    })
    await expect(
      runHook({
        data: { role: 4 }, // demoting to admin
        user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-victim', role: 5, systemRole: 'super_admin', isActive: true },
        payload,
      }),
    ).rejects.toThrow(/last active super-admin/i)
  })

  it('rejects deactivating the only active super_admin', async () => {
    const payload = makePayload({
      superAdminRoleId: 5,
      activeSuperAdmins: 0,
    })
    await expect(
      runHook({
        data: { isActive: false },
        user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-victim', role: 5, systemRole: 'super_admin', isActive: true },
        payload,
      }),
    ).rejects.toThrow(/last active super-admin/i)
  })

  it('allows demoting a super_admin when others remain', async () => {
    const payload = makePayload({
      roles: { 4: { slug: 'admin', level: 4 } },
      superAdminRoleId: 5,
      activeSuperAdmins: 2, // others exist
    })
    const result = await runHook({
      data: { role: 4 },
      user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true } },
      operation: 'update',
      originalDoc: { id: 'u-victim', role: 5, systemRole: 'super_admin', isActive: true },
      payload,
    })
    expect(result).toMatchObject({ role: 4 })
  })
})

describe('enforceRoleHierarchyHook — role/systemRole agreement (Deprecated)', () => {
  it('allows mutation even if systemRole differs because systemRole is deprecated', async () => {
    const payload = makePayload({ roles: { 4: { slug: 'admin', level: 4 } } })
    const result = await runHook({
      data: { role: 4, systemRole: 'student' },
      user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true } },
      operation: 'update',
      originalDoc: { id: 'u-victim' },
      payload,
    })
    expect(result).toMatchObject({ role: 4, systemRole: 'student' })
  })
})

describe('enforceRoleHierarchyHook — production safety on missing req.user', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('refuses in production when req.user is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await expect(
      runHook({
        data: { role: 4 },
        user: null,
        operation: 'create',
      }),
    ).rejects.toThrow(/User context is required/i)
  })

  it('refuses in development when req.user is missing without explicit bootstrap context', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    await expect(
      runHook({
        data: { role: 4 },
        user: null,
        operation: 'create',
      }),
    ).rejects.toThrow(/User context is required/i)
  })

  it('allows seed bootstrap only with explicit context', async () => {
    const payload = makePayload()
    const result = await runHook({
      data: { role: 4 },
      user: null,
      operation: 'create',
      payload,
      context: { allowUnauthenticatedBootstrap: true },
    })

    expect(result).toMatchObject({ role: 4 })
    expect(payload.logger.warn).toHaveBeenCalled()
  })
})

describe('enforceRoleHierarchyHook — req threading for transaction safety (Issue #36)', () => {
  it('threads req to payload.findByID when resolving role level by ID', async () => {
    const payload = makePayload({
      roles: { 7: { slug: 'coordinator', level: 2 } },
    })
    await runHook({
      data: { role: 7, collegeScope: 12 },
      user: { id: 'u-1', isActive: true, role: { slug: 'admin', level: 4, isActive: true } },
      operation: 'update',
      originalDoc: { id: 'u-2' },
      payload,
    })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ req: expect.objectContaining({ payload }) }),
    )
  })

  it('threads req to payload.find when counting other active super-admins', async () => {
    const payload = makePayload({
      roles: { 4: { slug: 'admin', level: 4 } },
      superAdminRoleId: 5,
      activeSuperAdmins: 0,
    })
    await expect(
      runHook({
        data: { role: 4 },
        user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true } },
        operation: 'update',
        originalDoc: { id: 'u-victim', role: 5, systemRole: 'super_admin', isActive: true },
        payload,
      }),
    ).rejects.toThrow(/last active super-admin/i)

    // Both `find` calls (roles slug lookup + users count) must carry `req`.
    for (const call of payload.find.mock.calls) {
      expect(call[0]).toMatchObject({ req: expect.objectContaining({ payload }) })
    }
  })
})

// ── Regression: Payload back-fills omitted fields before this hook runs ─────
//
// In the real Payload runtime, the field `beforeValidate` phase back-fills
// every field the client OMITTED from `originalDoc` BEFORE this collection
// `beforeChange` hook runs (verified in Payload core
// `collections/operations/utilities/update.js`). So on a partial update,
// `data.role`/`data.systemRole` are present and EQUAL to the original even
// when the client only touched an unrelated field. These tests reproduce that
// merged shape — which the older tests (passing only the changed field) never
// exercised — and assert the hook does NOT misfire on a no-op role/systemRole.
describe('enforceRoleHierarchyHook — back-filled (unchanged) role/systemRole must not misfire', () => {
  it('lets a student update only their own avatar (role back-filled, unchanged)', async () => {
    const payload = makePayload({ roles: { 'role-student': { slug: 'student', level: 0 } } })
    await expect(
      runHook({
        // Real merged data: client sent { avatar }, Payload back-filled the rest.
        data: {
          avatar: 'media-1',
          role: 'role-student',
          systemRole: 'student',
          isActive: true,
          collegeScope: null,
        },
        user: { id: 'u-self', isActive: true, role: { slug: 'student', level: 0, isActive: true }, roleSlug: 'student' },
        operation: 'update',
        originalDoc: {
          id: 'u-self',
          role: 'role-student',
          systemRole: 'student',
          isActive: true,
          collegeScope: null,
        },
        payload,
      }),
    ).resolves.toBeDefined()
  })

  it('lets an admin update only their own firstName (role back-filled, unchanged)', async () => {
    const payload = makePayload({ roles: { 'role-admin': { slug: 'admin', level: 4 } } })
    await expect(
      runHook({
        data: {
          firstName: 'New',
          role: 'role-admin',
          systemRole: 'admin',
          isActive: true,
        },
        user: { id: 'u-admin', isActive: true, role: { slug: 'admin', level: 4, isActive: true }, roleSlug: 'admin' },
        operation: 'update',
        originalDoc: {
          id: 'u-admin',
          role: 'role-admin',
          systemRole: 'admin',
          isActive: true,
        },
        payload,
      }),
    ).resolves.toBeDefined()
  })

  it('lets a content-manager update a peer at the same level (role back-filled, unchanged)', async () => {
    const payload = makePayload({ roles: { 'role-cm': { slug: 'content_manager', level: 3 } } })
    await expect(
      runHook({
        data: {
          firstName: 'Edited',
          role: 'role-cm', // same as target's existing role — not an assignment
          systemRole: 'content_manager',
          isActive: true,
        },
        user: { id: 'u-actor', isActive: true, role: { slug: 'content_manager', level: 3, isActive: true }, roleSlug: 'content_manager' },
        operation: 'update',
        originalDoc: {
          id: 'u-peer',
          role: 'role-cm',
          systemRole: 'content_manager',
          isActive: true,
        },
        payload,
      }),
    ).resolves.toBeDefined()
  })

  it('lets the sole active super-admin update their own name when the hidden systemRole still defaults to student', async () => {
    // UI-created super-admins get systemRole:'student' (hidden field default),
    // so the stored systemRole disagrees with the role. A no-op self-update
    // must NOT trip the last-super-admin guard.
    const payload = makePayload({
      roles: { 'role-super': { slug: 'super_admin', level: 5 } },
      superAdminRoleId: 'role-super',
      activeSuperAdmins: 0, // they are the only one
    })
    await expect(
      runHook({
        data: {
          firstName: 'Renamed',
          role: 'role-super',
          systemRole: 'student', // stale/back-filled — unchanged from original
          isActive: true,
        },
        user: {
          id: 'u-super',
          isActive: true,
          role: { slug: 'super_admin', level: 5, isActive: true },
          roleSlug: 'super_admin',
        },
        operation: 'update',
        originalDoc: {
          id: 'u-super',
          // CodeRabbit #3: populate role as an object carrying the slug so
          // getUserRoleSlug(originalDoc) resolves 'super_admin' and the
          // last-super-admin guard is actually exercised. With the bare id
          // 'role-super' the guard was never reached and this regression
          // covered nothing.
          role: { slug: 'super_admin', level: 5 },
          systemRole: 'student',
          isActive: true,
        },
        payload,
      }),
    ).resolves.toBeDefined()
  })

  it('STILL rejects a genuine escalation on a partial update (role actually changes)', async () => {
    // Guard against over-correction: when role truly differs from original,
    // the escalation check must still fire.
    const payload = makePayload({
      roles: {
        'role-super': { slug: 'super_admin', level: 5 },
        'role-admin': { slug: 'admin', level: 4 },
      },
    })
    await expect(
      runHook({
        data: { role: 'role-super', systemRole: 'admin', isActive: true },
        user: { id: 'u-actor', isActive: true, role: { slug: 'admin', level: 4, isActive: true }, roleSlug: 'admin' },
        operation: 'update',
        originalDoc: { id: 'u-victim', role: 'role-admin', systemRole: 'admin', isActive: true },
        payload,
      }),
    ).rejects.toThrow(/permission to assign this role/i)
  })

  it('STILL protects the last active super-admin from a genuine demotion', async () => {
    // Realistic shape: stored `role` is a numeric FK id, and `systemRole`
    // carries the slug (mirrors the existing super-admin tests). The client
    // sends role:4 (demote to admin); Payload back-fills the unchanged
    // systemRole/isActive.
    const payload = makePayload({
      roles: {
        5: { slug: 'super_admin', level: 5 },
        4: { slug: 'admin', level: 4 },
      },
      superAdminRoleId: 5,
      activeSuperAdmins: 0,
    })
    await expect(
      runHook({
        data: { role: 4, systemRole: 'super_admin', isActive: true },
        user: { id: 'u-actor', isActive: true, role: { slug: 'super_admin', level: 5, isActive: true }, roleSlug: 'super_admin' },
        operation: 'update',
        originalDoc: {
          id: 'u-victim',
          role: 5,
          systemRole: 'super_admin',
          isActive: true,
        },
        payload,
      }),
    ).rejects.toThrow(/last active super-admin/i)
  })
})
