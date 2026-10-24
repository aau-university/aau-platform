/**
 * Tests for the `beforeDelete` hook on the `roles` collection
 * (Issue #36 req threading + Issue #39 consolidation).
 *
 * Issue #39 replaced the inline `beforeDelete` in `src/collections/Roles.ts`
 * with the imported `enforceSystemRoleOnDelete` hook from
 * `src/hooks/enforceLastSuperAdminOnDelete.ts`. The imported hook is a
 * SUPERSET of the old inline logic — it also refuses deletion when
 * `slug === 'super_admin'` (defensive guard for legacy roles missing
 * `isSystemRole`). These tests verify that the wired hook:
 *
 *   1. Threads `req` to `payload.findByID` (Issue #36 regression guard).
 *   2. Refuses deletion of `isSystemRole: true` roles.
 *   3. Refuses deletion of `slug === 'super_admin'` roles (new defensive
 *      behavior introduced by the consolidation).
 *   4. Allows deletion of non-system, non-super_admin roles.
 *
 * The test extracts the hook from `Roles.hooks.beforeDelete[0]` (same as
 * the pre-Issue-#39 test) so it asserts the runtime wiring, not just the
 * imported function in isolation.
 */

import { describe, expect, it, vi } from 'vitest'

import { Roles } from '@/collections/Roles'

// Extract the wired beforeDelete hook from the collection config.
// It's the first (and only) entry in `hooks.beforeDelete`.
const beforeDeleteHook = Roles.hooks?.beforeDelete?.[0]
if (!beforeDeleteHook) {
  throw new Error('Expected Roles.hooks.beforeDelete[0] to be defined')
}

function runHook(args: {
  id: string | number
  role?: { isSystemRole?: boolean; slug?: string } | null
}): { promise: Promise<unknown>; findByID: ReturnType<typeof vi.fn>; req: unknown } {
  const findByID = vi.fn(async () => args.role ?? null)
  const req = { payload: { findByID }, user: { id: 'u-admin' } }

  const promise = (beforeDeleteHook as unknown as (a: unknown) => Promise<unknown>)({
    id: args.id,
    req,
    collection: { slug: 'roles' },
  })

  return { promise, findByID, req }
}

describe('Roles.beforeDelete — req threading (Issue #36)', () => {
  it('threads req to payload.findByID', async () => {
    const { promise, findByID, req } = runHook({
      id: 'role-1',
      role: { isSystemRole: false, slug: 'editor' },
    })

    await promise

    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })
})

describe('Roles.beforeDelete — system-role protection (Issue #39)', () => {
  it('refuses to delete a role flagged isSystemRole: true', async () => {
    const { promise } = runHook({
      id: 'role-sys',
      role: { isSystemRole: true, slug: 'admin' },
    })

    await expect(promise).rejects.toThrow(/Cannot delete system role/i)
  })

  it('refuses to delete the super_admin role even if isSystemRole is missing (defensive slug check)', async () => {
    const { promise } = runHook({
      id: 'role-super',
      role: { slug: 'super_admin' }, // isSystemRole not set
    })

    await expect(promise).rejects.toThrow(/Cannot delete system role/i)
  })

  it('allows deletion of a non-system, non-super_admin role', async () => {
    const { promise } = runHook({
      id: 'role-custom',
      role: { isSystemRole: false, slug: 'editor' },
    })

    await expect(promise).resolves.toBeUndefined()
  })
})
