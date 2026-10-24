import { relationshipId } from './relationship-id'
import { getUserCollegeScope } from './user-inspection'

/**
 * Type guard: true when the user's `collegeScope` resolves to the same id
 * as `collegeId`. Used to keep coordinators inside their own college
 * (e.g. a medicine coordinator must not edit an engineering college's
 * faculty). Returns false for users with no scope.
 */
export function isSameCollegeScope(user: unknown, collegeId: string | number): boolean {
  const scope = getUserCollegeScope(user)
  if (!scope) return false
  const scopeId = relationshipId(scope)
  if (scopeId === undefined) return false
  return String(scopeId) === String(collegeId)
}
