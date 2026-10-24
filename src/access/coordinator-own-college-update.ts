import type { Access, Where } from 'payload'

import { hasPermission } from './has-permission'
import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { isCoordinator } from './is-coordinator'
import { relationshipId } from './relationship-id'
import { getUserCollegeScope } from './user-inspection'

/**
 * Update access for the Colleges collection itself.
 *
 * Unlike `coordinatorScopedUpdate` (which scopes by a `college` relationship
 * field on college-linked content), a coordinator's scope here is the college
 * DOCUMENT — they may edit exactly the one college their `collegeScope`
 * points at, and only while their role holds the `colleges.manage` key.
 *
 * - Content manager (level 3) and above: full access, matching the level
 *   semantics of every other scoped content helper.
 * - Coordinator (level 2) with `colleges.manage` and a collegeScope:
 *   Where query pinning updates to their own college document.
 * - Everyone else: denied.
 *
 * The route-sensitive `slug` field has Content Manager field access.
 * `_status` intentionally does not: a scoped coordinator may publish and
 * unpublish their own college.
 */
export const coordinatorOwnCollegeUpdate: Access = ({ req }) => {
  const { user } = req

  if (!user) return false

  if (hasRoleLevelAtLeast(user, 3)) return true

  if (isCoordinator(user)) {
    if (!hasPermission(user, 'colleges.manage')) return false

    const scopeId = relationshipId(getUserCollegeScope(user))
    if (scopeId === undefined) return false

    const where: Where = { id: { equals: scopeId } }
    return where
  }

  return false
}
