import type { Access } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Content Manager (level 3) and above.
 */
export const isContentManagerOrAbove: Access = ({ req }) => {
  if (!req.user) return false
  return hasRoleLevelAtLeast(req.user, 3)
}
