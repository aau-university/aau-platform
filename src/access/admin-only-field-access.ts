import type { FieldAccess } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Field-level access guard: only admin (level 4+) can update
 * sensitive privilege fields (role, systemRole, isActive, collegeScope).
 *
 * Extracted from `src/collections/Users.ts` inline closure in PR-004 so it
 * can be reused by other collections that store privilege fields.
 */
export const adminOnlyFieldAccess: FieldAccess = ({ req: { user } }) => {
  return hasRoleLevelAtLeast(user as unknown, 4)
}
