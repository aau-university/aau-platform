import { isRoleActive } from './is-role-active'
import { isUserActive } from './is-user-active'
import { getUserRoleObject } from './user-inspection'

/**
 * canAccessAdmin — gate for the Payload admin UI.
 *
 * Rules:
 *   - deny anonymous users (no user)
 *   - deny inactive users and users whose role is inactive
 *   - allow only when the populated role or the trusted snapshot declares
 *     `canAccessPayloadAdmin === true`
 *
 * Fails CLOSED: the old fallback granted panel access to any level >= 2
 * user whenever the snapshot was unpopulated, ignoring the role's real
 * `canAccessPayloadAdmin` flag. With `injectRoleVirtualFields` rewriting
 * the snapshot on every user save (and no legacy user base), an absent
 * capability flag means "no admin UI", not "assume yes".
 */
export function canAccessAdmin(user: unknown): boolean {
  if (!user) return false
  if (!isUserActive(user)) return false
  if (!isRoleActive(user)) return false

  const record = user as Record<string, unknown>

  const role = getUserRoleObject(user)
  if (role) {
    return role.canAccessPayloadAdmin === true
  }

  return record.roleCanAccessPayloadAdmin === true
}
