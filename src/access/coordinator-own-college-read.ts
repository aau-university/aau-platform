import type { Access } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { hasPermission } from './has-permission'
import { isCoordinator } from './is-coordinator'
import { PUBLISHED_WHERE } from './published'
import { relationshipId } from './relationship-id'
import { getUserCollegeScope } from './user-inspection'

/**
 * Read access for the Colleges collection itself.
 *
 * Mirrors `coordinatorOwnCollegeUpdate` on the read side so a coordinator's
 * admin panel shows exactly the one college they belong to — the list view,
 * and every `colleges` relationship picker (a coordinator only ever assigns
 * their own college anyway; `enforceCoordinatorScope` pins it on write).
 *
 * - Content manager (level 3) and above: everything, including unpublished
 *   colleges.
 * - Coordinator with a `collegeScope`: only that college document.
 * - Coordinator without a scope: nothing (fails closed, consistent with
 *   `coordinatorOwnCollegeUpdate`).
 * - Everyone else, including the anonymous public site: published colleges
 *   only. Colleges moved from a hand-rolled `isActive` checkbox to Payload's
 *   `_status`, so this is the same shape of constraint against the field the
 *   draft workflow actually maintains.
 */
export const coordinatorOwnCollegeRead: Access = ({ req }) => {
  const { user } = req

  if (user && hasRoleLevelAtLeast(user, 3)) return true

  if (user && isCoordinator(user)) {
    if (!hasPermission(user, 'colleges.manage')) return false
    const scopeId = relationshipId(getUserCollegeScope(user))
    if (scopeId === undefined) return false
    return { id: { equals: scopeId } }
  }

  return PUBLISHED_WHERE
}
