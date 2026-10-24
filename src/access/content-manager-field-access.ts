import type { FieldAccess } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Field-level access guard for editorial fields owned by Content Manager
 * (level 3) and above.
 */
export const contentManagerFieldAccess: FieldAccess = ({ req: { user } }) => {
  return hasRoleLevelAtLeast(user as unknown, 3)
}
