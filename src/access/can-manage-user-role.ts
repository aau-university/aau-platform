import { ROLE_LEVELS } from './role-levels'
import { getUserRoleLevel, getUserRoleSlug } from './user-inspection'

/**
 * Can `currentUser` assign/modify a user whose target role slug is
 * `targetRole`? A super-admin can manage any role; otherwise the actor's
 * own role level must strictly exceed the target's. Used by the Users
 * collection to prevent privilege escalation (a coordinator cannot
 * promote someone to admin).
 */
export function canManageUserRole(currentUser: unknown, targetRole: string): boolean {
  const currentRole = getUserRoleSlug(currentUser)
  if (!currentRole) return false
  const currentLevel = getUserRoleLevel(currentUser)
  const targetLevel = ROLE_LEVELS[targetRole] ?? 0
  if (currentRole === 'super_admin') return true
  return currentLevel > targetLevel
}
