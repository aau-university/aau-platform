import type { Access, Where } from 'payload'

import { hasPermission } from './has-permission'
import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { isCoordinator } from './is-coordinator'

/**
 * Create (upload) access for the public `media` collection.
 *
 * - Content manager (level 3) and above: allowed.
 * - Coordinator (level 2) whose role holds `media.upload`: allowed —
 *   coordinators author college content (news, events, faculty…) and need
 *   images for it. Their uploads are stamped with `uploadedBy` by the
 *   `populateUploadedBy` hook.
 * - Everyone else: denied.
 */
export const canUploadMedia: Access = ({ req }) => {
  const { user } = req

  if (!user) return false
  if (hasRoleLevelAtLeast(user, 3)) return true
  if (isCoordinator(user)) return hasPermission(user, 'media.upload')

  return false
}

/**
 * Update/delete access for the public `media` collection.
 *
 * - Content manager (level 3) and above: full access.
 * - Coordinator with `media.upload`: limited to documents they uploaded
 *   themselves (`uploadedBy` ownership), so they can fix alt text or
 *   remove their own mistakes without touching anyone else's files.
 * - Everyone else: denied.
 */
export const mediaOwnerOrManager: Access = ({ req }) => {
  const { user } = req

  if (!user) return false
  if (hasRoleLevelAtLeast(user, 3)) return true

  if (isCoordinator(user) && hasPermission(user, 'media.upload')) {
    const where: Where = { uploadedBy: { equals: user.id } }
    return where
  }

  return false
}
