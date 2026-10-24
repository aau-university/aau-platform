import type { Access, Where } from 'payload'

import { hasPermission } from './has-permission'
import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { isCoordinator } from './is-coordinator'
import { relationshipId } from './relationship-id'
import { getUserCollegeScope } from './user-inspection'

export interface CoordinatorScopedReadVersionsOptions {
  /**
   * Capability key required for a coordinator to inspect version history.
   * Content Manager (level 3) and above are level-gated and bypass keys.
   */
  permission: string
  /**
   * Path on Payload's generated version row that points to the college.
   * College documents use `parent`; college-linked content uses
   * `version.college`.
   */
  collegePath?: 'parent' | 'version.college'
}

/**
 * Version-history access for college-scoped editorial collections.
 *
 * Payload evaluates `readVersions` against generated version rows, not the
 * live document. The query therefore must target `parent` for Colleges and
 * `version.college` for collections whose document stores a college
 * relationship.
 */
export function coordinatorScopedReadVersions(
  options: CoordinatorScopedReadVersionsOptions,
): Access {
  const collegePath = options.collegePath ?? 'version.college'

  return ({ req }) => {
    const { user } = req

    if (!user) return false
    if (hasRoleLevelAtLeast(user, 3)) return true

    if (!isCoordinator(user) || !hasPermission(user, options.permission)) {
      return false
    }

    const scopeId = relationshipId(getUserCollegeScope(user))
    if (scopeId === undefined) return false

    const where: Where = {
      [collegePath]: { equals: scopeId },
    }
    return where
  }
}
