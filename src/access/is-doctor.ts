import { getUserRoleSlug } from './user-inspection'

/**
 * Type guard: true when the user's resolved role slug is `doctor`.
 * Does NOT verify user/role active status.
 */
export function isDoctor(user: unknown): boolean {
  return getUserRoleSlug(user) === 'doctor'
}
