/**
 * Tests for `syncUsersOnRoleChange` — `afterChange` hook on the `roles`
 * collection (Issue #37).
 *
 * When a Role's `slug`, `level`, or `permissions` changes, every User
 * carrying that role has stale `roleSlug` / `roleLevel` / `rolePermissions` /
 * `roleIsActive` / `roleCanAccessPayloadAdmin` snapshot fields in their DB row + JWT. This hook bulk-updates
 * all affected Users to re-sync those fields from the fresh Role document.
 *
 * Coverage:
 *   - No change → no user updates triggered
 *   - Level changed → users get updated `roleLevel`
 *   - Permissions changed → users get updated `rolePermissions`
 *   - Slug changed → users get updated `roleSlug`
 *   - `skipRoleSync` context flag → early return, no updates
 *   - `create` operation → early return (no previousDoc to compare)
 *   - No users found → early return after find
 *   - `req` threaded to nested `payload.update` (transaction safety)
 *   - `req` threaded to `payload.find`
 *   - Error during user update → logged, then throws to fail closed
 *   - `allowUnauthenticatedBootstrap` set when `req.user` is absent
 *   - `skipInjectRoleFields` flag signaled in context
 */

import { describe, expect, it, vi } from 'vitest'

import { syncUsersOnRoleChange } from '@/hooks/syncUsersOnRoleChange'
import type { Role } from '@/payload-types'

/** Minimal shape of a Role doc sufficient for the hook. */
function role(overrides: Partial<Role> & { id: number }): Role {
  return {
    slug: 'coordinator',
    level: 2,
    permissions: [{ key: 'drafts:read' }],
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    name: 'Coordinator',
    ...overrides,
  } as Role
}

interface RunResult {
  find: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  errorLog: ReturnType<typeof vi.fn>
  infoLog: ReturnType<typeof vi.fn>
  returnedDoc: unknown
}

interface RunControls {
  find: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  errorLog: ReturnType<typeof vi.fn>
  infoLog: ReturnType<typeof vi.fn>
  promise: Promise<RunResult>
}

function setupHook(args: {
  doc: Partial<Role> & { id: number }
  previousDoc?: Partial<Role> & { id: number }
  operation?: 'create' | 'update'
  context?: Record<string, unknown>
  user?: Record<string, unknown> | null
  users?: Array<{ id: number | string }>
  updateError?: boolean
}): RunControls {
  const find = vi.fn(async () => ({
    docs: args.users ?? [],
    totalDocs: args.users?.length ?? 0,
    nextPage: null,
    page: 1,
    totalPages: 1,
  }))
  const update = vi.fn(async () => {
    if (args.updateError) throw new Error('update boom')
    return {}
  })
  const errorLog = vi.fn()
  const infoLog = vi.fn()

  const req = {
    payload: { find, update, logger: { error: errorLog, info: infoLog } },
    context: args.context ?? {},
    user: args.user === undefined ? { id: 'u-admin', roleLevel: 5 } : args.user,
  }

  const returnedDoc = (syncUsersOnRoleChange as unknown as (a: unknown) => Promise<unknown>)({
    doc: args.doc,
    previousDoc: args.previousDoc ?? args.doc,
    operation: args.operation ?? 'update',
    req,
    collection: { slug: 'roles' },
    context: req.context,
  })

  return {
    find,
    update,
    errorLog,
    infoLog,
    promise: returnedDoc.then((d) => ({ find, update, errorLog, infoLog, returnedDoc: d })),
  }
}

function runHook(args: Parameters<typeof setupHook>[0]): Promise<RunResult> {
  return setupHook(args).promise
}

describe('syncUsersOnRoleChange', () => {
  // ── No-op cases ────────────────────────────────────────────────────────

  it('does NOT trigger user updates when level/slug/permissions are unchanged', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 2, slug: 'coordinator', permissions: [{ key: 'p1' }] }),
      previousDoc: role({ id: 1, level: 2, slug: 'coordinator', permissions: [{ key: 'p1' }] }),
      users: [{ id: 'u-1' }],
    })

    expect(r.find).not.toHaveBeenCalled()
    expect(r.update).not.toHaveBeenCalled()
  })

  it('returns early on `create` operation (no previousDoc to compare)', async () => {
    const r = await runHook({
      doc: role({ id: 1 }),
      operation: 'create',
      users: [{ id: 'u-1' }],
    })

    expect(r.find).not.toHaveBeenCalled()
    expect(r.update).not.toHaveBeenCalled()
  })

  it('returns early when context.skipRoleSync === true', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }), // level changed
      context: { skipRoleSync: true },
      users: [{ id: 'u-1' }],
    })

    expect(r.find).not.toHaveBeenCalled()
    expect(r.update).not.toHaveBeenCalled()
  })

  it('does NOT call update when no users carry the role', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }), // level changed
      users: [], // no users
    })

    expect(r.find).toHaveBeenCalledTimes(1)
    expect(r.update).not.toHaveBeenCalled()
  })

  // ── Sync triggers ──────────────────────────────────────────────────────

  it('updates all users when role level changes (2→1)', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1, slug: 'coordinator', permissions: [{ key: 'p1' }] }),
      previousDoc: role({ id: 1, level: 2, slug: 'coordinator', permissions: [{ key: 'p1' }] }),
      users: [{ id: 'u-1' }, { id: 'u-2' }, { id: 'u-3' }],
    })

    expect(r.find).toHaveBeenCalledTimes(1)
    expect(r.update).toHaveBeenCalledTimes(3)

    // Each update gets the fresh roleLevel (1, not 2)
    for (let i = 0; i < 3; i++) {
      const call = r.update.mock.calls[i][0] as { data: Record<string, unknown> }
      expect(call.data.roleLevel).toBe(1)
      expect(call.data.roleSlug).toBe('coordinator')
      expect(call.data.rolePermissions).toEqual(['p1'])
      expect(call.data.roleIsActive).toBe(true)
      expect(call.data.roleCanAccessPayloadAdmin).toBe(false)
    }
  })

  it('updates users when role active state changes', async () => {
    const r = await runHook({
      doc: role({ id: 1, isActive: false }),
      previousDoc: role({ id: 1, isActive: true }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.roleIsActive).toBe(false)
  })

  it('updates users when role admin access state changes', async () => {
    const r = await runHook({
      doc: role({ id: 1, canAccessPayloadAdmin: true }),
      previousDoc: role({ id: 1, canAccessPayloadAdmin: false }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.roleCanAccessPayloadAdmin).toBe(true)
  })

  it('updates users when role slug changes', async () => {
    const r = await runHook({
      doc: role({ id: 1, slug: 'manager', level: 2, permissions: [{ key: 'p1' }] }),
      previousDoc: role({ id: 1, slug: 'coordinator', level: 2, permissions: [{ key: 'p1' }] }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.roleSlug).toBe('manager')
  })

  it('updates users when permissions change (new key added)', async () => {
    const r = await runHook({
      doc: role({
        id: 1,
        permissions: [{ key: 'p1' }, { key: 'p2' }],
      }),
      previousDoc: role({ id: 1, permissions: [{ key: 'p1' }] }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.rolePermissions).toEqual(['p1', 'p2'])
  })

  it('updates users when permissions change (key removed)', async () => {
    const r = await runHook({
      doc: role({ id: 1, permissions: [{ key: 'p1' }] }),
      previousDoc: role({ id: 1, permissions: [{ key: 'p1' }, { key: 'p2' }] }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.rolePermissions).toEqual(['p1'])
  })

  it('does NOT treat permission reordering as a change', async () => {
    const r = await runHook({
      doc: role({ id: 1, permissions: [{ key: 'p2' }, { key: 'p1' }] }),
      previousDoc: role({ id: 1, permissions: [{ key: 'p1' }, { key: 'p2' }] }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).not.toHaveBeenCalled()
  })

  it('handles null permissions gracefully (null → populated is a change)', async () => {
    const r = await runHook({
      doc: role({ id: 1, permissions: [{ key: 'p1' }] }),
      previousDoc: role({ id: 1, permissions: null }),
      users: [{ id: 'u-1' }],
    })

    expect(r.update).toHaveBeenCalledTimes(1)
    const call = r.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(call.data.rolePermissions).toEqual(['p1'])
  })

  // ── req threading (transaction safety) ────────────────────────────────

  it('threads req and overrideAccess to payload.find', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      users: [],
    })

    expect(r.find).toHaveBeenCalledTimes(1)
    const findCall = r.find.mock.calls[0][0] as { req?: unknown; overrideAccess?: boolean }
    expect(findCall.req).toBeDefined()
    expect((findCall.req as { payload: unknown }).payload).toBeDefined()
    expect(findCall.overrideAccess).toBe(true)
  })

  it('threads req and overrideAccess to every nested payload.update call', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      users: [{ id: 'u-1' }, { id: 'u-2' }],
    })

    expect(r.update).toHaveBeenCalledTimes(2)
    for (const callArgs of r.update.mock.calls) {
      const call = callArgs[0] as { req?: unknown; collection: string; overrideAccess?: boolean }
      expect(call.req).toBeDefined()
      expect((call.req as { payload: unknown }).payload).toBeDefined()
      expect(call.overrideAccess).toBe(true)
      expect(call.collection).toBe('users')
    }
  })

  it('passes the correct where filter to payload.find (role === doc.id)', async () => {
    const r = await runHook({
      doc: role({ id: 42, level: 1 }),
      previousDoc: role({ id: 42, level: 2 }),
      users: [],
    })

    const findCall = r.find.mock.calls[0][0] as { where: { role: { equals: unknown } } }
    expect(findCall.where).toEqual({ role: { equals: 42 } })
  })

  // ── Context flags ──────────────────────────────────────────────────────

  it('sets skipRoleSync + skipInjectRoleFields in the nested update context', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      users: [{ id: 'u-1' }],
    })

    const call = r.update.mock.calls[0][0] as { context: Record<string, unknown> }
    expect(call.context.skipRoleSync).toBe(true)
    expect(call.context.skipInjectRoleFields).toBe(true)
  })

  it('sets allowUnauthenticatedBootstrap when req.user is absent', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      user: null,
      users: [{ id: 'u-1' }],
    })

    const call = r.update.mock.calls[0][0] as { context: Record<string, unknown> }
    expect(call.context.allowUnauthenticatedBootstrap).toBe(true)
  })

  it('does NOT set allowUnauthenticatedBootstrap when req.user is present', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      user: { id: 'u-admin', roleLevel: 5 },
      users: [{ id: 'u-1' }],
    })

    const call = r.update.mock.calls[0][0] as { context: Record<string, unknown> }
    expect(call.context.allowUnauthenticatedBootstrap).toBeUndefined()
  })

  it('preserves existing context flags from the parent request', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      context: { disableRevalidate: true, customFlag: 'hello' },
      users: [{ id: 'u-1' }],
    })

    const call = r.update.mock.calls[0][0] as { context: Record<string, unknown> }
    expect(call.context.disableRevalidate).toBe(true)
    expect(call.context.customFlag).toBe('hello')
    expect(call.context.skipRoleSync).toBe(true)
  })

  // ── Error handling ────────────────────────────────────────────────────

  it('logs errors for every failed user update, then throws to fail closed', async () => {
    const r = setupHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      users: [{ id: 'u-1' }, { id: 'u-2' }],
      updateError: true,
    })

    await expect(r.promise).rejects.toThrow(/Failed to re-sync 2 user\(s\)/)

    // Both updates were attempted so every stale user is reported before rollback.
    expect(r.update).toHaveBeenCalledTimes(2)
    expect(r.errorLog).toHaveBeenCalledTimes(2)
    expect(r.infoLog).toHaveBeenCalledWith(
      expect.stringMatching(/Re-synced 0 user\(s\).*2 failed/),
    )
  })

  it('logs a success summary when all updates succeed', async () => {
    const r = await runHook({
      doc: role({ id: 1, level: 1 }),
      previousDoc: role({ id: 1, level: 2 }),
      users: [{ id: 'u-1' }, { id: 'u-2' }],
    })

    expect(r.infoLog).toHaveBeenCalledWith(
      expect.stringMatching(/Re-synced 2 user\(s\).*0 failed/),
    )
    expect(r.errorLog).not.toHaveBeenCalled()
  })

  // ── Return value ──────────────────────────────────────────────────────

  it('returns the doc unchanged', async () => {
    const doc = role({ id: 1, level: 1 })
    const r = await runHook({
      doc,
      previousDoc: role({ id: 1, level: 2 }),
      users: [{ id: 'u-1' }],
    })

    expect(r.returnedDoc).toBe(doc)
  })
})
