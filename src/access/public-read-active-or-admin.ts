import type { Access, Where } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Public can read active docs; Content Manager+ can read everything.
 * Used by non-draft collections whose visibility field is `isActive`.
 */
export const publicReadActiveOrAdmin: Access = ({ req }) => {
  if (req.user && hasRoleLevelAtLeast(req.user, 3)) {
    return true
  }

  const where: Where = {
    isActive: { equals: true },
  }
  return where
}
