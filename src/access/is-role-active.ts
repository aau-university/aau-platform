import { getUserRoleObject } from './user-inspection'

/**
 * Returns true if the user's role is explicitly active.
 *
 * Resolution order:
 *   1. Populated role object's `isActive` flag.
 *   2. `roleIsActive` JWT snapshot (set by `injectRoleVirtualFields`).
 *
 * Fails CLOSED: a missing/NULL flag counts as inactive. The old fail-open
 * default was a transitional bridge for rows created before the snapshot
 * fields existed; with no legacy user base, treating an unknown role state
 * as active is a privilege hole. `Roles.isActive` has `defaultValue: true`
 * and the snapshot is rewritten on every user save, so legitimate users
 * always carry an explicit flag.
 */
export function isRoleActive(user: unknown): boolean {
  const role = getUserRoleObject(user)
  const record = user && typeof user === 'object' ? (user as Record<string, unknown>) : undefined

  const flag = role?.isActive ?? record?.roleIsActive
  return flag === true
}
