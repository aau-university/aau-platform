import { getUserRoleLevel } from './user-inspection'
import { isRoleActive } from './is-role-active'
import { isUserActive } from './is-user-active'

/**
 * Type guard: true when the user+role are active and the user's role
 * level is >= `minLevel`. The canonical levels are in `role-levels.ts`
 * (super_admin=5, admin=4, content_manager=3, coordinator=2,
 * student/doctor=1).
 */
export function hasRoleLevelAtLeast(user: unknown, minLevel: number): boolean {
  if (!isUserActive(user)) return false
  if (!isRoleActive(user)) return false
  return getUserRoleLevel(user) >= minLevel
}
