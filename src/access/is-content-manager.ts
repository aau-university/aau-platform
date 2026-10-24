import { getUserRoleSlug } from './user-inspection'

/**
 * Type guard: true when the user's resolved role slug is `content_manager`.
 * Does NOT verify user/role active status.
 */
export function isContentManager(user: unknown): boolean {
  return getUserRoleSlug(user) === 'content_manager'
}
