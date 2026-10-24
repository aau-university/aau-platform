import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { APIError } from 'payload'

import { getUserCollegeScope, hasRoleLevelAtLeast, isCoordinator, relationshipId } from '../access'

interface ApplyCoordinatorScopeArgs {
  data: Record<string, unknown>
  req: PayloadRequest
  operation: 'create' | 'update'
  originalDoc: unknown
  collegeField: string
}

/**
 * Shared enforcement core for the two hooks below: coordinator college
 * scoping at write time.
 *
 * Rules:
 *   - Anonymous: passes through (other access functions reject earlier).
 *   - Content manager+ (level >= 3): no restrictions.
 *   - Coordinator without `collegeScope`: denied.
 *   - Coordinator with `collegeScope`:
 *       * On create: `data.college` MUST equal the coordinator's collegeScope.
 *         If `data.college` is missing, the hook injects it (so coordinators
 *         don't have to remember to set the field — the API still rejects an
 *         explicit cross-college value).
 *       * On update: `data.college` (if provided) MUST equal the
 *         coordinator's collegeScope. The original document's `college` is
 *         also checked: it must match the scope (else the coordinator is
 *         trying to mutate a document outside their college, which the row-
 *         level `coordinatorScopedUpdate` Where filter should also block —
 *         this is defense in depth).
 *
 * @param options.collegeField - the name of the relationship field that ties
 *   a document to a College. Defaults to `'college'`.
 */
function applyCoordinatorScope({
  data,
  req,
  operation,
  originalDoc,
  collegeField,
}: ApplyCoordinatorScopeArgs): Record<string, unknown> {
  const user = req.user
  if (!user) return data

  // Privileged users pass through without modification.
  if (hasRoleLevelAtLeast(user, 3)) return data

  if (!isCoordinator(user)) {
    // Students/doctors/etc. shouldn't reach this hook because access
    // control denies them earlier; pass through and let access reject.
    return data
  }

  // Coordinator — must have a collegeScope.
  const scope = relationshipId(getUserCollegeScope(user))
  if (scope === undefined) {
    throw new APIError(
      'Coordinator account is missing a collegeScope; ask an administrator to assign one.',
      403,
    )
  }

  const incomingCollegeId = relationshipId(data[collegeField])

  if (operation === 'create') {
    if (incomingCollegeId === undefined) {
      // Inject the coordinator's scope as the college for new docs.
      data[collegeField] = scope
    } else if (String(incomingCollegeId) !== String(scope)) {
      throw new APIError(
        `Coordinators can only create ${collegeField}-scoped content for their own college.`,
        403,
      )
    }
  } else if (operation === 'update') {
    // If they sent a college, it must match their scope.
    if (incomingCollegeId !== undefined && String(incomingCollegeId) !== String(scope)) {
      throw new APIError(`Coordinators cannot move documents to another college.`, 403)
    }
    // Defense in depth: also verify the original belongs to the scope.
    const originalCollegeId = relationshipId(
      (originalDoc as Record<string, unknown> | undefined)?.[collegeField],
    )
    if (originalCollegeId !== undefined && String(originalCollegeId) !== String(scope)) {
      throw new APIError(
        'Coordinators can only update documents belonging to their own college.',
        403,
      )
    }
  }

  return data
}

/**
 * Collection `beforeChange` hook enforcing the rules above. Runs AFTER
 * field validation, so on collections where `college` is `required: true`
 * the injection alone arrives too late — pair it with
 * `enforceCoordinatorScopeBeforeValidate` there.
 */
export function enforceCoordinatorScopeHook(
  options: { collegeField?: string } = {},
): CollectionBeforeChangeHook {
  const collegeField = options.collegeField ?? 'college'

  return async ({ data, req, operation, originalDoc }) =>
    applyCoordinatorScope({ data, req, operation, originalDoc, collegeField })
}

/**
 * Collection `beforeValidate` variant. Payload runs `beforeValidate`
 * BEFORE field validation, so injecting the coordinator's `collegeScope`
 * here lets a coordinator create docs on collections where `college` is
 * `required: true` (AcademicPrograms, AcademicDepartments, FacultyMembers)
 * without tripping the required-field check. The `beforeChange` hook stays
 * registered as defense in depth.
 */
export function enforceCoordinatorScopeBeforeValidate(
  options: { collegeField?: string } = {},
): CollectionBeforeValidateHook {
  const collegeField = options.collegeField ?? 'college'

  return async ({ data, req, operation, originalDoc }) => {
    if (!data) return data
    return applyCoordinatorScope({ data, req, operation, originalDoc, collegeField })
  }
}
