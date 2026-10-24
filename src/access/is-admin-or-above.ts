import type { Access } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Admin (level 4) or Super Admin (level 5) only.
 */
export const isAdminOrAbove: Access = ({ req }) => {
  if (!req.user) return false
  return hasRoleLevelAtLeast(req.user, 4)
}
