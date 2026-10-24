import { getUserRoleSlug } from './user-inspection'

/**
 * Type guard: true when the user's resolved role slug is `admin`.
 * Does NOT verify user/role active status — combine with `isUserActive`
 * when gating privileged operations.
 */
export function isAdmin(user: unknown): boolean {
  return getUserRoleSlug(user) === 'admin'
}
