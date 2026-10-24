/**
 * Tests for `injectRoleVirtualFieldsHook` (PR-016).
 *
 * The hook reads the incoming `data.role` (which may be a populated Role
 * object or just an ID), fetches the live Role document via the Local API,
 * and writes three `saveToJWT: true` virtual fields onto the user doc:
 *
 *   - `roleSlug`        — `role.slug`
 *   - `roleLevel`       — `role.level`
 *   - `rolePermissions` — `role.permissions` (string[] of keys)
 *   - `roleIsActive`    — `role.isActive !== false`
 *   - `roleCanAccessPayloadAdmin` — `role.canAccessPayloadAdmin === true`
 *
 * Extracted verbatim from `src/collections/Users.ts`'s inline closure.
 * This is a behavioral no-op — these tests prove the extraction preserves
 * the original behavior.
 *
 * Two scenarios from the PR-016 spec:
 *   1. Populates roleSlug/roleLevel/rolePermissions from req.user.role.
 *   2. Handles null/undefined role gracefully.
 *
 * Bonus tests cover the populated-object path (`data.role` already an
 * object) and the error-swallow path.
 */

import { describe, expect, it, vi } from 'vitest'

import { injectRoleVirtualFieldsHook } from '@/hooks/injectRoleVirtualFields'

function runHook(args: {
  data: Record<string, unknown>
  roleDoc?:
    | { slug?: string; level?: number; permissions?: unknown; isActive?: boolean | null; canAccessPayloadAdmin?: boolean | null }
    | null
  throwOnFind?: boolean
}): Promise<Record<string, unknown>> {
  const findByID = vi.fn(async () => {
    if (args.throwOnFind) throw new Error('boom')
    return args.roleDoc ?? null
  })
  const errorLog = vi.fn()

  return (injectRoleVirtualFieldsHook as unknown as (a: unknown) => Promise<unknown>)({
    data: args.data,
    operation: 'create',
    req: {
      user: { id: 'u-admin' },
      payload: { findByID, logger: { error: errorLog } },
    },
    collection: { slug: 'users' },
  }) as Promise<Record<string, unknown>>
}

describe('injectRoleVirtualFieldsHook', () => {
  it('populates roleSlug/roleLevel/rolePermissions from the role relationship', async () => {
    const result = await runHook({
      data: { role: 'role-admin-1', email: 'a@b.c' },
      roleDoc: {
        slug: 'admin',
        level: 4,
        isActive: true,
        canAccessPayloadAdmin: true,
        permissions: [{ key: 'users:read' }, { key: 'users:write' }],
      },
    })

    expect(result.roleSlug).toBe('admin')
    expect(result.roleLevel).toBe(4)
    expect(result.rolePermissions).toEqual(['users:read', 'users:write'])
    expect(result.roleIsActive).toBe(true)
    expect(result.roleCanAccessPayloadAdmin).toBe(true)
  })

  it('sets roleIsActive=false when the role is inactive', async () => {
    const result = await runHook({
      data: { role: 'role-inactive' },
      roleDoc: { slug: 'admin', level: 4, isActive: false, permissions: [] },
    })

    expect(result.roleIsActive).toBe(false)
  })

  it('sets roleCanAccessPayloadAdmin=false unless the role explicitly grants it', async () => {
    const result = await runHook({
      data: { role: 'role-student' },
      roleDoc: { slug: 'student', level: 1, isActive: true, canAccessPayloadAdmin: false, permissions: [] },
    })

    expect(result.roleCanAccessPayloadAdmin).toBe(false)
  })

  it('handles null/undefined role gracefully (no fetch, no virtual fields)', async () => {
    const result = await runHook({
      data: { email: 'a@b.c' }, // no role
    })
    expect(result.roleSlug).toBeUndefined()
    expect(result.roleLevel).toBeUndefined()
    expect(result.rolePermissions).toBeUndefined()
    expect(result.roleIsActive).toBeUndefined()
    expect(result.roleCanAccessPayloadAdmin).toBeUndefined()
  })

  it('also handles data.role === null', async () => {
    const result = await runHook({
      data: { role: null, email: 'a@b.c' },
    })
    expect(result.roleSlug).toBeUndefined()
    expect(result.roleLevel).toBeUndefined()
    expect(result.rolePermissions).toBeUndefined()
    expect(result.roleIsActive).toBeUndefined()
    expect(result.roleCanAccessPayloadAdmin).toBeUndefined()
  })

  it('accepts a populated role object on data.role and extracts its id for the fetch', async () => {
    const result = await runHook({
      data: { role: { id: 'role-cm-1' } }, // populated object — hook reads .id
      roleDoc: { slug: 'content_manager', level: 3, permissions: ['news:write'] },
    })

    expect(result.roleSlug).toBe('content_manager')
    expect(result.roleLevel).toBe(3)
    expect(result.rolePermissions).toEqual(['news:write'])
  })

  it('tolerates permissions declared as plain strings (legacy seed shape)', async () => {
    const result = await runHook({
      data: { role: 'role-x' },
      roleDoc: { slug: 'admin', level: 4, permissions: ['p1', 'p2'] },
    })
    expect(result.rolePermissions).toEqual(['p1', 'p2'])
  })

  it('swallows findByID errors and logs them (doc still written without virtual fields)', async () => {
    const result = await runHook({
      data: { role: 'role-gone' },
      throwOnFind: true,
    })

    expect(result.roleSlug).toBeUndefined()
    expect(result.roleLevel).toBeUndefined()
    expect(result.rolePermissions).toBeUndefined()
    expect(result.roleIsActive).toBeUndefined()
    expect(result.roleCanAccessPayloadAdmin).toBeUndefined()
  })

  it('threads req to payload.findByID for transaction safety (Issue #36)', async () => {
    const findByID = vi.fn(async () => ({
      slug: 'admin',
      level: 4,
      permissions: [],
    }))
    const req = {
      user: { id: 'u-admin' },
      payload: { findByID, logger: { error: vi.fn() } },
    }

    await (injectRoleVirtualFieldsHook as unknown as (a: unknown) => Promise<unknown>)({
      data: { role: 'role-1' },
      operation: 'create',
      req,
      collection: { slug: 'users' },
    })

    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ req }),
    )
  })
})
