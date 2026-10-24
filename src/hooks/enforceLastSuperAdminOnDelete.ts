import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * `enforceLastSuperAdminOnDelete` (PR-016 / Issue #39 consolidated owner).
 *
 * Cross-cutting `beforeDelete` hook for the `users` collection: refuses to
 * delete the last `super_admin` user. Prevents a self-inflicted lockout
 * where an admin deletes the only remaining super_admin and can no longer
 * perform privileged operations.
 *
 * Behavior:
 *   1. Fetch the user being deleted with `depth: 1` so `role` is populated
 *      to a `{ slug, ... }` object.
 *   2. If the user's `role.slug !== 'super_admin'`, the delete proceeds.
 *   3. If the user IS an active super_admin, count the *other* active
 *      (`isActive: true`) super_admins, excluding the target itself —
 *      matching `countOtherActiveSuperAdmins` in `enforceRoleHierarchy.ts`,
 *      which enforces the same invariant on the demote/deactivate path. If
 *      there are zero others, throw `Error('Cannot delete the last
 *      super_admin user')`. Deleting an *inactive* super_admin is always
 *      allowed (it removes no active coverage).
 *
 * This is the single source of truth for last-super-admin delete protection
 * (Issue #39). A non-standard duplicate that previously lived in
 * `./enforceRoleHierarchy.ts` (signature `({ req, id })`, threw `APIError`,
 * failed-closed on missing `req.user`) has been removed; the Users collection
 * is now wired directly to this hook.
 *
 * Also exports `enforceSystemRoleOnDelete` — a `beforeDelete` variant for
 * the `roles` collection that refuses to delete a system role. A role is
 * considered "system" if `role.isSystemRole === true` OR `role.slug ===
 * 'super_admin'` (defensive: even if `isSystemRole` is missing on a legacy
 * super_admin role, the slug check catches it). The Roles collection is
 * wired directly to this hook (Issue #39 — replaces an inline duplicate).
 */
export const enforceLastSuperAdminOnDelete: CollectionBeforeDeleteHook = async ({
  req,
  id,
}) => {
  const user = (await req.payload.findByID({
    collection: 'users',
    id,
    depth: 1,
    overrideAccess: true,
    req, // thread req for transaction safety (per ADAPTERS.md)
  })) as
    | {
        role?: { slug?: string; id?: string | number } | string | number | null
        isActive?: boolean | null
      }
    | null

  if (!user || !user.role) return

  const roleSlug =
    typeof user.role === 'object' && user.role !== null
      ? user.role.slug
      : undefined

  if (roleSlug !== 'super_admin') return

  // Deleting an *inactive* super-admin can never reduce the number of active
  // super-admins, so it is always safe — short-circuit before counting.
  // (Counting active supers while the target is inactive would wrongly block
  // deleting a deactivated account whenever exactly one active super-admin
  // remains — a false positive.)
  if (user.isActive === false) return

  // The target is an active super-admin. Require at least one *other* active
  // super-admin to survive the delete. We exclude the target via
  // `id: { not_equals }` and count OTHERS (mirrors
  // `countOtherActiveSuperAdmins` in `enforceRoleHierarchy.ts`) rather than
  // counting the target itself and comparing against 1 — the latter
  // mishandles a mixed active/inactive super-admin population.
  //
  // Payload's `Where` type's index signature doesn't allow `undefined` for
  // mutually-exclusive keys, so we build the where clause as a single
  // concrete object per branch and cast through `unknown` to `Where`.
  const roleId =
    typeof user.role === 'object' && user.role !== null ? user.role.id : undefined

  const where = roleId
    ? ({
        and: [
          { role: { equals: roleId } },
          { isActive: { equals: true } },
          { id: { not_equals: id } },
        ],
      } as const)
    : ({
        and: [
          { 'role.slug': { equals: 'super_admin' } },
          { isActive: { equals: true } },
          { id: { not_equals: id } },
        ],
      } as const)

  const count = await req.payload.count({
    collection: 'users',
    where: where as unknown as never,
    overrideAccess: true,
    req, // thread req for transaction safety (per ADAPTERS.md)
  })

  // Payload 3's `count` returns `{ totalDocs: number }` (NOT `total` —
  // the PR-016 spec's pseudo-code was aspirational; the live API is
  // `totalDocs`). Treat both fields defensively in case of API drift.
  const otherActiveSuperAdmins =
    (count as { totalDocs?: number; total?: number }).totalDocs ??
    (count as { total?: number }).total ??
    0

  if (otherActiveSuperAdmins < 1) {
    throw new Error('Cannot delete the last super_admin user')
  }
}

/**
 * `enforceSystemRoleOnDelete` — `beforeDelete` variant for the `roles`
 * collection. Refuses to delete a role that is marked `isSystemRole: true`
 * OR whose slug is `'super_admin'` (defensive guard for legacy data).
 *
 * Wired into `roles` collection in a Phase 1 PR. Added here in isolation
 * with unit tests.
 */
export const enforceSystemRoleOnDelete: CollectionBeforeDeleteHook = async ({
  req,
  id,
}) => {
  const role = (await req.payload.findByID({
    collection: 'roles',
    id,
    depth: 0,
    overrideAccess: true,
    req, // thread req for transaction safety (per ADAPTERS.md)
  })) as
    | { slug?: string | null; isSystemRole?: boolean | null }
    | null

  if (!role) return

  if (role.isSystemRole === true || role.slug === 'super_admin') {
    throw new Error(
      `Cannot delete system role '${role.slug ?? '<unknown>'}'. System roles are protected.`,
    )
  }
}
