import { getUserRoleSlug } from './user-inspection'

/**
 * Type guard: true when the user's resolved role slug is `student`.
 * Does NOT verify user/role active status.
 */
export function isStudent(user: unknown): boolean {
  return getUserRoleSlug(user) === 'student'
}
