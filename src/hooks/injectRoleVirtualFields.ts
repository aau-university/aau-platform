import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `injectRoleVirtualFieldsHook` (PR-016).
 *
 * Cross-cutting `beforeChange` hook for the `users` collection. Reads the
 * incoming `data.role` (which may be a populated Role object or just an ID),
 * fetches the live Role document via the Local API, and writes three
 * `saveToJWT: true` virtual fields onto the user doc:
 *
 *   - `roleSlug`        — `role.slug`           (e.g. `'super_admin'`)
 *   - `roleLevel`       — `role.level`          (numeric privilege level)
 *   - `rolePermissions` — `role.permissions`    (string[] — keys only)
 *   - `roleIsActive`    — `role.isActive !== false`
 *   - `roleCanAccessPayloadAdmin` — `role.canAccessPayloadAdmin === true`
 *
 * Because all three fields are declared with `saveToJWT: true` on the Users
 * collection, Payload serializes them into the JWT on login / token refresh.
 * This means downstream access-control / proxy / API code can read the role
 * metadata straight off the JWT without a DB lookup on every request.
 *
 * Extracted verbatim from `src/collections/Users/index.ts` (which was at
 * `src/collections/Users.ts` before folderization) — behavioral no-op, just
 * moving the inline closure to its own file so other collections / future
 * PRs can compose or reuse it.
 *
 * Errors during the role fetch are logged and swallowed — the doc is still
 * written, just without the virtual fields updated. This matches the prior
 * inline behavior (callers depend on this: seeders, importers, etc.).
 */
export const injectRoleVirtualFieldsHook: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data.role) return data

  const roleId =
    typeof data.role === 'object' && data.role !== null
      ? (data.role as { id?: unknown }).id
      : data.role

  // Skip the role fetch when the role is unchanged and the snapshot is
  // already populated — Payload back-fills `data.role` on every partial
  // update, so without this check every user save costs an extra
  // `findByID`. Role-document changes are propagated to user snapshots by
  // `syncUsersOnRoleChange`, so an unchanged role ID means a fresh snapshot.
  const original = originalDoc as Record<string, unknown> | undefined
  const originalRoleId =
    original && typeof original.role === 'object' && original.role !== null
      ? (original.role as { id?: unknown }).id
      : original?.role
  if (
    roleId !== undefined &&
    originalRoleId !== undefined &&
    String(roleId) === String(originalRoleId) &&
    typeof original?.roleSlug === 'string'
  ) {
    return data
  }

  if (roleId && req.payload) {
    try {
      const roleDoc = await req.payload.findByID({
        collection: 'roles',
        id: roleId as string | number,
        depth: 0,
        overrideAccess: true,
        req, // thread req for transaction safety (per ADAPTERS.md)
      })
      if (roleDoc) {
        data.roleSlug = roleDoc.slug
        data.roleLevel = roleDoc.level
        data.rolePermissions = normalizeRolePermissions(roleDoc.permissions)
        data.roleIsActive = roleDoc.isActive !== false
        data.roleCanAccessPayloadAdmin = roleDoc.canAccessPayloadAdmin === true
      }
    } catch (e) {
      req.payload.logger.error(
        `Failed to fetch role ${String(roleId)} for virtual fields: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  return data
}

/**
 * Normalize a Role's `permissions` field (an array of `{ key: string }`
 * objects OR plain strings) into a flat `string[]` of permission keys.
 *
 * The Roles collection declares `permissions` as an array of group fields
 * each with a `key` text subfield — so the populated shape is
 * `Array<{ key: string }>`. Some seed / import paths emit plain strings, so
 * both shapes are tolerated. Unknown shapes contribute no entries.
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
