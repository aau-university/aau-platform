import type { Access, Where } from 'payload'

import { hasPermission } from './has-permission'
import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { isCoordinator } from './is-coordinator'
import { getUserCollegeScope } from './user-inspection'

export interface CoordinatorScopedWriteOptions {
  /**
   * Capability key (e.g. `'news.manage'`) the coordinator's role must hold.
   * Role `permissions` are enforced here — an admin unchecking the key in
   * the Roles collection actually revokes the coordinator's write access.
   * Content manager (level 3) and above are level-gated and bypass keys.
   */
  permission: string
}

/**
 * College-scoped update access for coordinators.
 *
 * - Content manager (level 3) and above: full access (returns true).
 * - Coordinator (level 2) whose role holds `permission` and who has a
 *   collegeScope: returns a Where query limiting docs to their college.
 * - Coordinator missing the permission or scope, student, doctor,
 *   anonymous: denied (false).
 *
 * Used on college-linked collections: News, Events, Announcements,
 * AcademicDepartments, AcademicPrograms, FacultyMembers, StudyPlans.
 */
export function coordinatorScopedUpdate(options: CoordinatorScopedWriteOptions): Access {
  return ({ req }) => {
    const { user } = req

    if (!user) return false

    // Content manager and above: unrestricted
    if (hasRoleLevelAtLeast(user, 3)) return true

    // Coordinator: requires the capability key AND a college scope
    if (isCoordinator(user)) {
      if (!hasPermission(user, options.permission)) return false

      const scope = getUserCollegeScope(user)
      if (!scope) return false

      const scopeId = typeof scope === 'object' ? (scope as Record<string, unknown>).id : scope

      const where: Where = {
        college: { equals: scopeId as string | number },
      }
      return where
    }

    // Student, doctor, unauthenticated: denied
    return false
  }
}

/**
 * College-scoped create access for coordinators.
 *
 * `create` access is boolean-only in Payload — a `Where` object returned
 * from a create access function is merely coerced to "allowed" and
 * constrains nothing. This explicit boolean variant makes that contract
 * visible; the actual college enforcement on create happens in
 * `enforceCoordinatorScopeHook` / `enforceCoordinatorScopeBeforeValidate`.
 *
 * - Content manager (level 3) and above: allowed.
 * - Coordinator (level 2) whose role holds `permission` and who has a
 *   collegeScope: allowed (hook pins the college).
 * - Coordinator missing the permission or scope, student, doctor,
 *   anonymous: denied.
 */
export function coordinatorScopedCreate(options: CoordinatorScopedWriteOptions): Access {
  return ({ req }) => {
    const { user } = req

    if (!user) return false
    if (hasRoleLevelAtLeast(user, 3)) return true
    if (isCoordinator(user)) {
      return hasPermission(user, options.permission) && Boolean(getUserCollegeScope(user))
    }

    return false
  }
}
