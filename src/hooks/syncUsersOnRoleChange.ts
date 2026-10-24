import type { CollectionAfterChangeHook } from 'payload'

import type { Role } from '@/payload-types'

/**
 * `syncUsersOnRoleChange` — `afterChange` hook on the `roles` collection.
 *
 * Issue #37: The Users collection persists `roleSlug` / `roleLevel` /
 * `rolePermissions` / `roleCanAccessPayloadAdmin` as `saveToJWT: true` snapshot fields (written by the
 * `injectRoleVirtualFields` `beforeChange` hook). When a Role's `slug`,
 * `level`, `permissions`, `isActive`, or `canAccessPayloadAdmin` changes, every User carrying that role keeps
 * **stale** snapshot values in their DB row — and in their JWT (up to 7 days
 * via `tokenExpiration`) — until the User is re-saved.
 *
 * This hook closes the stale window: after a Role is updated, it
 * bulk-updates every affected User to re-sync their snapshot fields from the
 * fresh Role document (`doc`).
 *
 * Hardens the #35 security fix: a demoted coordinator (level 2→1) loses
 * draft access immediately (next request re-issues JWT), rather than waiting
 * up to 7 days for JWT expiry.
 *
 * ## Context flags
 *
 * - `skipRoleSync` — when `true`, this hook returns early. Set on every
 *   nested `payload.update` call below to prevent re-entry if a future
 *   user→role feedback hook is added (defensive, per HOOKS.md context
 *   pattern).
 * - `skipInjectRoleFields` — signaled to `injectRoleVirtualFields` so it can
 *   short-circuit during this bulk sync (forward-compat). Currently that
 *   hook does not check this flag, but because we pass `data` **without**
 *   `data.role`, `injectRoleVirtualFields` returns early on its own
 *   (`if (!data.role) return data`) — so our pre-written snapshot values
 *   survive untouched. No double-work, no extra `findByID` per user.
 * - `allowUnauthenticatedBootstrap` — set when `req.user` is absent (seed /
 *   migration paths) so `enforceRoleHierarchyHook` does not reject the
 *   bulk update. Safe because we never touch locked fields (`role`,
 *   `systemRole`, `collegeScope`, `isActive`) — only derived snapshot fields.
 *
 * ## Transaction safety
 *
 * `req` is threaded to every nested `payload.find` and `payload.update` call
 * (per ADAPTERS.md) so the re-sync participates in the parent Role update's
 * transaction — if the Role update rolls back, the User re-sync does too.
 */
export const syncUsersOnRoleChange: CollectionAfterChangeHook<Role> = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  // Skip on create — a brand-new role has no users assigned yet.
  if (operation === 'create') return doc

  // Infinite-loop guard (per HOOKS.md context pattern).
  if (req.context.skipRoleSync === true) return doc

  // Only re-sync when a snapshot-relevant field actually changed.
  const levelChanged = doc.level !== previousDoc.level
  const slugChanged = doc.slug !== previousDoc.slug
  const permsChanged = !permissionsKeysEqual(doc.permissions, previousDoc.permissions)
  const activeChanged = doc.isActive !== previousDoc.isActive
  const adminAccessChanged = doc.canAccessPayloadAdmin !== previousDoc.canAccessPayloadAdmin

  if (!levelChanged && !slugChanged && !permsChanged && !activeChanged && !adminAccessChanged) return doc

  const { payload, context } = req

  // Find all users carrying this role. `limit: 0` returns all matches.
  // `overrideAccess: true` ensures we reach every user regardless of the
  // caller's read scope. `req` is threaded for transaction safety.
  const users = await payload.find({
    collection: 'users',
    where: { role: { equals: doc.id } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (users.docs.length === 0) return doc

  // Pre-compute the fresh snapshot values from the Role `doc` itself — no
  // need to re-fetch the role per user (the afterChange `doc` already
  // carries the updated `slug` / `level` / `permissions` / `isActive` / admin access flag).
  const roleSlug = doc.slug
  const roleLevel = doc.level
  const rolePermissions = normalizeRolePermissions(doc.permissions)
  const roleIsActive = doc.isActive !== false
  const roleCanAccessPayloadAdmin = doc.canAccessPayloadAdmin === true

  // Build the context for nested user updates. We spread the existing
  // context to preserve caller-set flags (e.g. `disableRevalidate`), then
  // add our own.
  const syncContext: Record<string, unknown> = {
    ...context,
    skipRoleSync: true,
    skipInjectRoleFields: true,
  }
  // Seed / migration paths may not have req.user. enforceRoleHierarchyHook
  // rejects unauthenticated mutations unless this flag is set. Safe here
  // because we only write derived snapshot fields, never locked fields.
  if (!req.user) {
    syncContext.allowUnauthenticatedBootstrap = true
  }

  let synced = 0
  let failed = 0

  for (const user of users.docs) {
    try {
      await payload.update({
        collection: 'users',
        id: user.id,
        // We pass ONLY the snapshot fields — NOT `role`. This is critical:
        //   1. `injectRoleVirtualFields` sees `!data.role` and returns early,
        //      so our pre-computed values survive (no double-work).
        //   2. `enforceRoleHierarchyHook` sees `data.role === undefined` and
        //      skips escalation / self-protection / last-super-admin rules
        //      (we're not changing the user's role, just re-syncing derived
        //      metadata).
        data: { roleSlug, roleLevel, rolePermissions, roleIsActive, roleCanAccessPayloadAdmin },
        depth: 0,
        overrideAccess: true,
        req, // thread req — same transaction as the parent Role update
        context: syncContext,
      })
      synced += 1
    } catch (e) {
      failed += 1
      payload.logger.error(
        `[syncUsersOnRoleChange] Failed to re-sync user ${String(user.id)} for role ${String(doc.id)}: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  payload.logger.info(
    `[syncUsersOnRoleChange] Re-synced ${synced} user(s) for role ${String(doc.id)} (${failed} failed)`,
  )

  if (failed > 0) {
    throw new Error(
      `[syncUsersOnRoleChange] Failed to re-sync ${failed} user(s) for role ${String(doc.id)}`,
    )
  }

  return doc
}

/**
 * Compare two Role `permissions` arrays by their normalized `key` lists.
 * Handles `null`/`undefined`, reordering, and duplicate keys.
 */
function permissionsKeysEqual(
  a: Role['permissions'],
  b: Role['permissions'],
): boolean {
  const ka = normalizeRolePermissions(a)
  const kb = normalizeRolePermissions(b)
  if (ka.length !== kb.length) return false
  const sa = [...ka].sort().join('\u0000')
  const sb = [...kb].sort().join('\u0000')
  return sa === sb
}

/**
 * Normalize a Role's `permissions` field (an array of `{ key: string }`
 * objects OR plain strings) into a flat `string[]` of permission keys.
 *
 * Mirrors the private `normalizeRolePermissions` in
 * `injectRoleVirtualFields.ts`. Duplicated here (rather than exported from
 * that file) to comply with the Issue #37 SOP constraint: "Do NOT modify
 * `injectRoleVirtualFields.ts`". A future refactor should extract this into
 * a shared `src/access/permissions.ts` util.
 */
function normalizeRolePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((permission) => {
    if (typeof permission === 'string') return [permission]
    if (permission && typeof permission === 'object') {
      const key = (permission as Record<string, unknown>).key
      return typeof key === 'string' ? [key] : []
    }
    return []
  })
}
