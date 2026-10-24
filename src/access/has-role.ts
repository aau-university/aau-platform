import { getUserRoleSlug } from './user-inspection'

/**
 * Type guard: true when the user's resolved role slug equals `role`.
 * Does NOT verify user/role active status — a thin slug comparison only.
 */
export function hasRole(user: unknown, role: string): boolean {
  return getUserRoleSlug(user) === role
}
