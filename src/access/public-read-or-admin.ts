import type { Access, Where } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Public can read published docs; Content Manager+ can read everything.
 * For collections with an `isPublished` field.
 *
 * The sole consumer is `NavigationMenus`, which has no `college` field —
 * a coordinator-scoped `college` branch here would make Payload query a
 * non-existent field path and reject every coordinator read. Coordinators
 * therefore read published menus like the public.
 */
export const publicReadOrAdmin: Access = ({ req }) => {
  // Content manager+ can see all docs
  if (req.user && hasRoleLevelAtLeast(req.user, 3)) {
    return true
  }

  // Public (and coordinator/student/doctor): only published docs
  const where: Where = {
    isPublished: { equals: true },
  }
  return where
}
