import { ROLE_LEVELS } from './role-levels'

/**
 * Resolve the slug of a user's role.
 *
 * Looks at, in order:
 *   1. user.role.slug — when the relationship is populated to a Role object
 *      (freshest source: whoever populated it just read it from the DB).
 *   2. user.role when it's already a string slug (transitional code paths).
 *   3. user.roleSlug — the `saveToJWT` snapshot, used when `role` isn't
 *      populated (the common case — most requests carry only the JWT/DB
 *      snapshot, not a depth>=1 relationship).
 *   4. user.systemRole — the transitional select kept on Users for JWT use.
 *
 * Populated-object-first matches `isRoleActive`/`canAccessAdmin`'s
 * precedence: a fresh `role` object should never lose to a possibly-stale
 * snapshot that hasn't been re-synced yet (see `syncUsersOnRoleChange`).
 *
 * Returns `undefined` if none of the above yields a non-empty string.
 */
export function getUserRoleSlug(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') return undefined
  const record = user as Record<string, unknown>

  const role = record.role

  if (typeof role === 'string') return role
  if (role && typeof role === 'object') {
    const slug = (role as Record<string, unknown>).slug
    if (typeof slug === 'string' && slug.trim() !== '') return slug
  }

  if (typeof record.roleSlug === 'string' && record.roleSlug.trim() !== '') {
    return record.roleSlug
  }

  return typeof record.systemRole === 'string' ? record.systemRole : undefined
}

/**
 * Returns the populated Role object if the user has one, else undefined.
 * Useful for reading capability flags like `canAccessPayloadAdmin`.
 */
export function getUserRoleObject(user: unknown): Record<string, unknown> | undefined {
  if (!user || typeof user !== 'object') return undefined
  const role = (user as Record<string, unknown>).role
  if (role && typeof role === 'object') return role as Record<string, unknown>
  return undefined
}

export function getUserCollegeScope(user: unknown): unknown {
  if (!user || typeof user !== 'object') return undefined
  return (user as Record<string, unknown>).collegeScope
}

export function getUserRoleLevel(user: unknown): number {
  if (!user || typeof user !== 'object') return 0
  const record = user as Record<string, unknown>

  // Populated role object wins over the snapshot (see `getUserRoleSlug`
  // for why) — a fresh `role.level` beats a possibly-stale `roleLevel`.
  // SECURITY (CodeRabbit #1): if the populated role carries a `slug` but
  // no `level`, derive the level from the fresh slug BEFORE falling back
  // to the possibly-stale `roleLevel` snapshot. Otherwise a demoted user
  // whose role was just re-populated (e.g. after syncUsersOnRoleChange)
  // could keep their old elevated level until the snapshot catches up.
  const role = getUserRoleObject(user)
  if (role) {
    if (typeof role.level === 'number') return role.level
    const slug = typeof role.slug === 'string' ? role.slug.trim() : ''
    if (slug !== '') return ROLE_LEVELS[slug] ?? 0
  }

  // Only fall back to the snapshot once the fresh role has been exhausted.
  if (typeof record.roleLevel === 'number') return record.roleLevel

  const roleSlug = getUserRoleSlug(user)
  return roleSlug ? (ROLE_LEVELS[roleSlug] ?? 0) : 0
}

function normalizePermissions(value: unknown): string[] {
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

export function getUserPermissions(user: unknown): string[] {
  if (!user || typeof user !== 'object') return []
  const record = user as Record<string, unknown>

  // Populated role object wins over the snapshot (see `getUserRoleSlug`) —
  // but only when it actually carries a `permissions` array. A partially
  // populated or field-access-stripped role object (e.g. `{ id: 3 }`, or a
  // role read by a non-admin whose `permissions` field is hidden) must fall
  // through to the `rolePermissions` snapshot, mirroring how
  // `getUserRoleLevel` falls through when `role.level` is absent. Without
  // this guard such a role would resolve to `[]` and silently drop every
  // permission the snapshot still carries.
  const role = getUserRoleObject(user)
  if (role && Array.isArray(role.permissions)) {
    return normalizePermissions(role.permissions)
  }

  if (Array.isArray(record.rolePermissions)) {
    return normalizePermissions(record.rolePermissions)
  }

  return []
}
