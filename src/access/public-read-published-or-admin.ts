import type { Access, Where } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Public can read published docs, content manager+ can read everything.
 * Alias for non-draft collections that use an `isPublished` field and do not
 * need coordinator college scoping.
 */
export const publicReadPublishedOrAdmin: Access = ({ req }) => {
  if (req.user && hasRoleLevelAtLeast(req.user, 3)) {
    return true
  }

  const where: Where = {
    isPublished: { equals: true },
  }
  return where
}
