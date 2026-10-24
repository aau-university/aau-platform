import { isSuperAdmin } from './is-super-admin'
import { isRoleActive } from './is-role-active'
import { isUserActive } from './is-user-active'
import { getUserPermissions } from './user-inspection'

/**
 * Type guard: true when the user+role are active and the user holds the
 * named `permission` (or is a super-admin, who implicitly holds all
 * permissions). `permission` is a capability key string, not a role slug.
 */
export function hasPermission(user: unknown, permission: string): boolean {
  if (!isUserActive(user)) return false
  if (!isRoleActive(user)) return false
  if (isSuperAdmin(user)) return true
  return getUserPermissions(user).includes(permission)
}
