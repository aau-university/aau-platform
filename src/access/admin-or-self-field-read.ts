import type { FieldAccess } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'

/**
 * Field-level read guard: admin can read anyone's role; users can read their own.
 *
 * Extracted from `src/collections/Users.ts` inline closure in PR-004.
 */
export const adminOrSelfFieldRead: FieldAccess = ({ req: { user }, id }) => {
  if (!user) return false
  if (hasRoleLevelAtLeast(user as unknown, 4)) return true
  // Compare against the document's ID
  return (user as unknown as Record<string, unknown>).id === id
}
