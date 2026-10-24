import { getUserRoleSlug } from './user-inspection'
import { isRoleActive } from './is-role-active'
import { isUserActive } from './is-user-active'

/**
 * Type guard: true only when the user AND their role are both active and
 * the resolved role slug is `coordinator`.
 */
export function isCoordinator(user: unknown): boolean {
  if (!isUserActive(user)) return false
  if (!isRoleActive(user)) return false
  return getUserRoleSlug(user) === 'coordinator'
}
