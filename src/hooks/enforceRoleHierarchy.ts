import type { CollectionBeforeChangeHook, Payload, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import {
  ROLE_LEVELS,
  getUserRoleLevel,
  getUserRoleSlug,
  isRoleActive,
  isUserActive,
  relationshipId,
} from '../access'

/**
 * Pure function: checks whether an acting user's role slug is allowed to
 * assign a role at the given target level.
 *
 * Rules:
 * - super_admin can assign any level (including super_admin itself).
 * - Any other role can only assign roles STRICTLY below its own level.
 *   (Admin cannot assign admin; this is intentional and tested.)
 * - Falsy/empty actingRoleSlug always returns false.
 */
export function checkRoleEscalation(
  actingRoleSlug: string | null | undefined,
  targetLevel: number,
): boolean {
  if (!actingRoleSlug) return false
  if (actingRoleSlug === 'super_admin') return true
  const actingLevel = ROLE_LEVELS[actingRoleSlug] ?? 0
  return actingLevel > targetLevel
}

/**
 * Resolve the numeric `level` of a role value coming from the API.
 *
 * Accepted shapes:
 *   - a populated Role object with `slug` and/or `level`
 *   - a string slug ('admin', 'student', ...)
 *   - a numeric or string ID — looked up via `req.payload.findByID`
 *
 * Returns `undefined` when no level can be resolved.
 */
async function resolveTargetLevel(
  incoming: unknown,
  payload: Payload,
  req: PayloadRequest,
): Promise<number | undefined> {
  if (incoming === null || incoming === undefined) return undefined

  // Populated object
  if (typeof incoming === 'object') {
    const obj = incoming as Record<string, unknown>
    if (typeof obj.level === 'number') return obj.level
    if (typeof obj.slug === 'string') {
      const fromTable = ROLE_LEVELS[obj.slug]
      if (typeof fromTable === 'number') return fromTable
    }
    // Object with only id — fall through to ID lookup
    const id = relationshipId(obj)
    if (id !== undefined) return lookupRoleLevelById(id, payload, req)
    return undefined
  }

  // String slug or string ID
  if (typeof incoming === 'string') {
    // Try slug first
    if (Object.prototype.hasOwnProperty.call(ROLE_LEVELS, incoming)) {
      return ROLE_LEVELS[incoming]
    }
    // Otherwise treat as ID
    return lookupRoleLevelById(incoming, payload, req)
  }

  if (typeof incoming === 'number') {
    return lookupRoleLevelById(incoming, payload, req)
  }

  return undefined
}

async function lookupRoleLevelById(
  id: string | number,
  payload: Payload,
  req: PayloadRequest,
): Promise<number | undefined> {
  try {
    const doc = await payload.findByID({
      collection: 'roles',
      id,
      depth: 0,
      // Internal lookup; we are resolving privilege metadata, not user data.
      overrideAccess: true,
      req, // thread req for transaction safety (per ADAPTERS.md)
    })
    const level = (doc as { level?: unknown } | null | undefined)?.level
    if (typeof level === 'number') return level
    // Fall back to slug -> ROLE_LEVELS map
    const slug = (doc as { slug?: unknown } | null | undefined)?.slug
    if (typeof slug === 'string' && Object.prototype.hasOwnProperty.call(ROLE_LEVELS, slug)) {
      return ROLE_LEVELS[slug]
    }
    return undefined
  } catch {
    return undefined
  }
}

async function resolveTargetRoleSlug(
  incoming: unknown,
  payload: Payload,
  req: PayloadRequest,
): Promise<string | undefined> {
  if (incoming === null || incoming === undefined) return undefined

  if (typeof incoming === 'object') {
    const obj = incoming as Record<string, unknown>
    if (typeof obj.slug === 'string') return obj.slug
    const id = relationshipId(obj)
    if (id !== undefined) return lookupRoleSlugById(id, payload, req)
    return undefined
  }

  if (typeof incoming === 'string') {
    if (Object.prototype.hasOwnProperty.call(ROLE_LEVELS, incoming)) return incoming
    return lookupRoleSlugById(incoming, payload, req)
  }

  if (typeof incoming === 'number') return lookupRoleSlugById(incoming, payload, req)

  return undefined
}

async function lookupRoleSlugById(
  id: string | number,
  payload: Payload,
  req: PayloadRequest,
): Promise<string | undefined> {
  try {
    const doc = await payload.findByID({
      collection: 'roles',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const slug = (doc as { slug?: unknown } | null | undefined)?.slug
    return typeof slug === 'string' ? slug : undefined
  } catch {
    return undefined
  }
}

/**
 * Compare two relationship values (ID, populated object, or null) without
 * assuming they share the same shape. `JSON.stringify` equality is only a
 * fast path — a client sending the bare ID while `originalDoc` carries the
 * populated object must still compare equal.
 */
function sameRelationshipRef(a: unknown, b: unknown): boolean {
  if (JSON.stringify(a) === JSON.stringify(b)) return true
  const aId = relationshipId(a)
  const bId = relationshipId(b)
  if (aId !== undefined && bId !== undefined) return String(aId) === String(bId)
  return false
}

/**
 * Shape-tolerant equality for `role` values specifically. Falls back to
 * resolving both sides to a role slug (via `resolveTargetRoleSlug`, which
 * can look IDs up in the roles collection) when ID comparison is not
 * possible — e.g. `data.role` is an ID string while `originalDoc.role` is
 * a populated object without an `id`. Unresolvable sides compare as NOT
 * equal, which fails closed (treated as a genuine role change and run
 * through the escalation guards).
 */
async function sameRoleRef(
  a: unknown,
  b: unknown,
  payload: Payload,
  req: PayloadRequest,
): Promise<boolean> {
  if (sameRelationshipRef(a, b)) return true
  const aSlug = await resolveTargetRoleSlug(a, payload, req)
  const bSlug = await resolveTargetRoleSlug(b, payload, req)
  if (aSlug !== undefined && bSlug !== undefined) return aSlug === bSlug
  return false
}

/**
 * Count the number of currently-active super-admin users, excluding the one
 * we're about to mutate.
 */
async function countOtherActiveSuperAdmins(
  payload: Payload,
  excludeId: unknown,
  req: PayloadRequest,
): Promise<number> {
  // Resolve the super_admin role's ID first (slug lookup).
  const roles = await payload.find({
    collection: 'roles',
    where: { slug: { equals: 'super_admin' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req, // thread req for transaction safety (per ADAPTERS.md)
  })
  const superAdminRole = roles.docs[0]
  if (!superAdminRole) return 0

  const result = await payload.find({
    collection: 'users',
    where: {
      and: [
        { role: { equals: superAdminRole.id } },
        { isActive: { equals: true } },
        ...(excludeId !== undefined && excludeId !== null
          ? [{ id: { not_equals: excludeId } }]
          : []),
      ],
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    req, // thread req for transaction safety (per ADAPTERS.md)
  })
  return result.totalDocs
}

/**
 * Payload `beforeChange` hook for the Users collection.
 *
 * Enforced rules:
 *   1. Self-protection: a user cannot change their own role, systemRole,
 *      collegeScope, or isActive. Admins must use a different user account.
 *   2. Role escalation: actingUser can only assign a role strictly below
 *      its own level. super_admin can assign super_admin.
 *   3. systemRole and role must agree — if both are present, the systemRole
 *      level must equal the resolved role level (else reject).
 *   4. Last-super-admin protection: a super_admin user cannot be deactivated,
 *      deleted, or demoted if they are the only active super-admin.
 *   5. Operations without `req.user` fail closed unless an explicit
 *      seed/bootstrap context flag is present.
 */
export const enforceRoleHierarchyHook: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
  operation,
  context,
}) => {
  if (!req.user) {
    if ((context as Record<string, unknown> | undefined)?.allowUnauthenticatedBootstrap === true) {
      req.payload?.logger?.warn?.(
        '[enforceRoleHierarchyHook] explicit bootstrap bypass used without req.user',
      )
      return data
    }

    throw new APIError(
      'User context is required for user mutations. Use the explicit bootstrap context only in seed code.',
      403,
    )
  }

  const actingUser = req.user as unknown as Record<string, unknown>
  const actingUserId = actingUser.id
  const actingRoleSlug = getUserRoleSlug(actingUser)
  const actingRoleLevel = getUserRoleLevel(actingUser)

  if (!isUserActive(actingUser) || !isRoleActive(actingUser)) {
    throw new APIError('Inactive users or roles cannot mutate user privileges.', 403)
  }

  // ── Rule 1: self-protection ─────────────────────────────────────────────
  if (
    operation === 'update' &&
    originalDoc &&
    String((originalDoc as Record<string, unknown>).id) === String(actingUserId)
  ) {
    const SELF_LOCKED_FIELDS = ['role', 'systemRole', 'collegeScope', 'isActive'] as const
    const original = originalDoc as Record<string, unknown>
    for (const field of SELF_LOCKED_FIELDS) {
      if (data[field] === undefined) continue
      // Only reject when the value actually changes. Relationship fields
      // need shape-tolerant comparison — Payload may back-fill
      // `originalDoc` with a populated object while the client sends the
      // bare ID (or vice versa).
      let changed: boolean
      if (field === 'role') {
        changed = !(await sameRoleRef(data.role, original.role, req.payload, req))
      } else if (field === 'collegeScope') {
        changed = !sameRelationshipRef(data.collegeScope, original.collegeScope)
      } else {
        changed = JSON.stringify(data[field]) !== JSON.stringify(original[field])
      }
      if (changed) {
        throw new APIError(`You cannot modify your own ${field}.`, 403)
      }
    }
  }

  // ── Change detection (shared by Rules 2–4) ──────────────────────────────
  //
  // Payload back-fills every field the client OMITTED from `originalDoc`
  // during the field `beforeValidate` phase, which runs BEFORE this
  // collection `beforeChange` hook (verified in Payload core
  // `collections/operations/utilities/update.js`: beforeValidate-fields →
  // beforeValidate-collection → beforeChange-collection). So on a partial
  // update `data.role` and `data.systemRole` are ALWAYS present even when the
  // client never touched them. We must compare against `originalDoc` to
  // detect a GENUINE change — exactly as Rule 1 does above — otherwise every
  // ordinary self-update (a user editing their own name or avatar) would trip
  // the escalation / last-super-admin guards below, and the last active
  // super-admin whose hidden `systemRole` still defaults to `student` would
  // become un-editable. On create there is no `originalDoc`, so any provided
  // value is a real assignment.
  const priorDoc = originalDoc as Record<string, unknown> | undefined
  const roleIsChanging =
    data.role !== undefined &&
    (operation !== 'update' ||
      !priorDoc ||
      !(await sameRoleRef(data.role, priorDoc.role, req.payload, req)))
  const systemRoleIsChanging =
    typeof data.systemRole === 'string' &&
    (operation !== 'update' || !priorDoc || data.systemRole !== priorDoc.systemRole)

  // ── Rule 4 (pre-check): last-super-admin protection on demote/deactivate ─
  if (operation === 'update' && originalDoc) {
    const original = originalDoc as Record<string, unknown>
    const originalRoleSlug =
      getUserRoleSlug(original) ??
      (typeof original.systemRole === 'string' ? original.systemRole : undefined)

    const isOriginalSuperAdmin = originalRoleSlug === 'super_admin'
    if (isOriginalSuperAdmin) {
      // Demoting? (only when role/systemRole GENUINELY change — not merely
      // back-filled to their existing values on an unrelated update)
      const targetRoleChanged = roleIsChanging
      const targetSystemRoleChanged = systemRoleIsChanging
      // Deactivating?
      const targetIsActive = data.isActive
      const isDeactivating =
        targetIsActive !== undefined && original.isActive !== false && targetIsActive === false

      if (targetRoleChanged || targetSystemRoleChanged || isDeactivating) {
        const others = await countOtherActiveSuperAdmins(req.payload, original.id, req)
        if (others === 0) {
          // We're touching the only active super-admin's privilege/status.
          // If the change demotes them or deactivates them, refuse.
          let willStillBeSuperAdmin = !targetRoleChanged && !targetSystemRoleChanged
          if (targetRoleChanged) {
            const nextLevel = await resolveTargetLevel(data.role, req.payload, req)
            willStillBeSuperAdmin = nextLevel === ROLE_LEVELS.super_admin
          }
          if (
            targetSystemRoleChanged &&
            typeof data.systemRole === 'string' &&
            data.systemRole !== 'super_admin'
          ) {
            willStillBeSuperAdmin = false
          }
          if (isDeactivating || !willStillBeSuperAdmin) {
            throw new APIError(
              'Cannot demote or deactivate the last active super-admin.',
              403,
            )
          }
        }
      }
    }
  }

  // ── Rule 2 + 3: role/systemRole escalation ─────────────────────────────
  // Use the change-detected values (computed above): only treat this as a
  // role assignment when the role/systemRole GENUINELY changes vs the
  // original, so a back-filled unchanged value can't trip the escalation
  // check on an ordinary self-update.
  const incomingRole = roleIsChanging ? data.role : undefined
  const incomingSystemRole = systemRoleIsChanging ? data.systemRole : undefined

  let targetRoleSlug: string | undefined
  if (incomingRole !== undefined) {
    targetRoleSlug = await resolveTargetRoleSlug(incomingRole, req.payload, req)
  }
  if (!targetRoleSlug && typeof incomingSystemRole === 'string') {
    targetRoleSlug = incomingSystemRole
  }
  if (!targetRoleSlug && operation === 'update' && originalDoc) {
    targetRoleSlug = getUserRoleSlug(originalDoc)
  }

  const nextIsActive = data.isActive !== undefined
    ? data.isActive !== false
    : (originalDoc as Record<string, unknown> | undefined)?.isActive !== false

  if (targetRoleSlug === 'coordinator' && nextIsActive) {
    const originalScope = relationshipId(
      (originalDoc as Record<string, unknown> | undefined)?.collegeScope,
    )
    const nextScope = data.collegeScope !== undefined
      ? relationshipId(data.collegeScope)
      : originalScope

    if (nextScope === undefined) {
      throw new APIError('Coordinator role requires a collegeScope.', 400)
    }
  }

  // Only act when something role-related is changing
  if (incomingRole !== undefined || typeof incomingSystemRole === 'string') {
    // Rule 3: check the HIGHEST privilege being assigned. Resolving from
    // `role` alone would let a write smuggle `systemRole: 'super_admin'`
    // past the escalation check by pairing it with a low-level `role`
    // (systemRole is the last-resort fallback in getUserRoleSlug, so a
    // planted value becomes live for any user whose role/snapshot is
    // missing). Take the max of both sources so neither can escalate.
    let targetLevel: number | undefined
    if (incomingRole !== undefined) {
      targetLevel = await resolveTargetLevel(incomingRole, req.payload, req)
    }
    if (typeof incomingSystemRole === 'string') {
      const systemRoleLevel = ROLE_LEVELS[incomingSystemRole]
      if (typeof systemRoleLevel === 'number') {
        targetLevel =
          targetLevel === undefined ? systemRoleLevel : Math.max(targetLevel, systemRoleLevel)
      }
    }

    if (targetLevel !== undefined) {
      const allowed = actingRoleSlug === 'super_admin' || actingRoleLevel > targetLevel
      if (!allowed) {
        throw new APIError(
          'You do not have permission to assign this role. Your role level must be strictly above the target role level.',
          403,
        )
      }
    } else if (incomingRole !== undefined || typeof incomingSystemRole === 'string') {
      // Unable to resolve any level even though role was specified — refuse.
      throw new APIError('Unable to resolve target role level; refusing mutation.', 400)
    }
  }

  return data
}

// NOTE (Issue #39): the non-standard `enforceLastSuperAdminOnDelete` that used
// to live here has been removed. Use the standard `CollectionBeforeDeleteHook`
// implementation exported from `./enforceLastSuperAdminOnDelete.ts` instead —
// it is the single source of truth for "refuse deleting the last super_admin
// user" and is wired into `Users.hooks.beforeDelete` directly.
