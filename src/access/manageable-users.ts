import type { Access, FieldAccess, FilterOptionsProps, Where } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { isSuperAdmin } from './is-super-admin'
import { relationshipId } from './relationship-id'
import { getUserRoleLevel } from './user-inspection'

/**
 * "Lower-privilege user management" — the rule that lets a content manager
 * (level 3) administer coordinators, students and doctors without ever being
 * able to touch an admin, a super-admin, or a peer content manager.
 *
 * Level semantics (see `role-levels.ts`): super_admin 5, admin 4,
 * content_manager 3, coordinator 2, student/doctor 1.
 *
 * The comparison is on the `roleLevel` snapshot column, which
 * `injectRoleVirtualFields` writes on every user save and
 * `syncUsersOnRoleChange` refreshes when a Role's level changes. Rows with a
 * NULL `roleLevel` never satisfy `less_than`, so an unsynced legacy row stays
 * invisible to a manager rather than leaking — it fails closed.
 *
 * This is only the *row* half of the guard. Which role may be ASSIGNED is
 * enforced independently by `enforceRoleHierarchyHook` (throws on
 * escalation) and by `assignableRolesFilter` on the `role` field, so a
 * manager cannot promote a coordinator into their own tier.
 */

const MANAGER_LEVEL = 3
const FULL_ACCESS_LEVEL = 4

function selfOrLowerLevel(user: unknown): Where {
  const record = user as Record<string, unknown>
  return {
    or: [
      { id: { equals: record.id as number | string } },
      { roleLevel: { less_than: getUserRoleLevel(user) } },
    ],
  }
}

/**
 * Read: admin+ sees every user; a content manager sees themselves plus every
 * user below their level; everyone else sees only themselves.
 */
export const readManageableUsers: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRoleLevelAtLeast(user, FULL_ACCESS_LEVEL)) return true
  if (hasRoleLevelAtLeast(user, MANAGER_LEVEL)) return selfOrLowerLevel(user)
  return { id: { equals: (user as unknown as Record<string, unknown>).id as number | string } }
}

/**
 * Update: admin+ updates anyone; a content manager updates themselves and
 * lower-level users; everyone else updates only their own record. Sensitive
 * fields stay behind their own field-level access.
 */
export const updateManageableUsers: Access = ({ req: { user }, id }) => {
  if (!user) return false
  if (hasRoleLevelAtLeast(user, FULL_ACCESS_LEVEL)) return true
  if (hasRoleLevelAtLeast(user, MANAGER_LEVEL)) return selfOrLowerLevel(user)
  return (user as unknown as Record<string, unknown>).id === id
}

/**
 * Create: content manager (level 3) and above. WHICH role the new account
 * may carry is not decided here — `enforceRoleHierarchyHook` rejects any
 * role at or above the creator's own level, so a content manager can mint a
 * coordinator/student/doctor but never an admin, super-admin, or peer.
 */
export const createManageableUsers: Access = ({ req: { user } }) => {
  if (!user) return false
  return hasRoleLevelAtLeast(user, MANAGER_LEVEL)
}

/**
 * Delete: strictly lower-level users only, for level 3+. Super-admins are
 * unrestricted. `enforceLastSuperAdminOnDelete` still protects the final
 * super-admin account.
 */
export const deleteManageableUsers: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRoleLevelAtLeast(user, 5)) return true
  if (hasRoleLevelAtLeast(user, MANAGER_LEVEL)) {
    return { roleLevel: { less_than: getUserRoleLevel(user) } }
  }
  return false
}

/**
 * Field-level guard for the privilege fields on Users (`role`,
 * `collegeScope`, `isActive`).
 *
 * Content manager and above, rather than the previous admin-only rule: a
 * content manager must be able to set a new coordinator's role and pin their
 * college. It is safe at level 3 because the collection-level access above
 * already restricts which user rows they can touch at all.
 */
export const privilegedUserFieldAccess: FieldAccess = ({ req: { user } }) => {
  return hasRoleLevelAtLeast(user as unknown, MANAGER_LEVEL)
}

/**
 * Read guard for the privilege fields, paired with
 * {@link privilegedUserFieldAccess} on the write side.
 *
 * A manager who may CHANGE a field must also be able to SEE it. Leaving
 * `role` at the admin-only read guard blanked the Users list `role` column
 * and rendered the REQUIRED role picker empty for a content manager, forcing
 * them to blindly re-pick a role just to save an unrelated edit. Users can
 * still always read their own.
 */
export const privilegedUserFieldRead: FieldAccess = ({ req: { user }, id }) => {
  if (!user) return false
  if (hasRoleLevelAtLeast(user as unknown, MANAGER_LEVEL)) return true
  return (user as unknown as Record<string, unknown>).id === id
}

/**
 * `filterOptions` for the Users → Roles relationship: the role picker offers
 * roles strictly below the actor's own level, PLUS whatever role the target
 * user already has.
 *
 * This is not merely cosmetic. Payload validates `filterOptions` server-side
 * on save — it re-queries the target collection with
 * `{ id: { in: submittedIds } } AND <this filter>` and rejects anything that
 * does not come back — so it holds over REST/GraphQL too, independently of
 * the admin UI. It is the third layer alongside field-level access and
 * `enforceRoleHierarchyHook`, which is the layer that returns a clear 403
 * instead of a generic "invalid selection".
 *
 * Note that the validation query itself runs through `req.payloadDataLoader`
 * with the default `overrideAccess: true`, so it is NOT constrained by the
 * caller's Roles read access — this filter is the only thing narrowing it.
 * The admin panel's role picker is separately narrowed by `Roles.read`,
 * because that goes over REST with access control applied.
 *
 * The "already has" clause is what makes ordinary edits work. Payload
 * back-fills every omitted field from the stored document before validation,
 * so `role` is ALWAYS present on an update even when the client never sent
 * it. Without this clause a plain profile edit (name, avatar, password)
 * re-submits the user's existing role, which fails `level < ownLevel` for
 * anyone whose role is at or above the actor's own — locking every user out
 * of their own profile and stopping an admin from editing another admin.
 * Constraining only genuine CHANGES is the correct contract, and it costs one
 * indexed lookup on a rarely-written collection.
 *
 * Note: adding a custom `validate` to the `role` field would silently
 * disable this check unless that validate re-invokes Payload's default
 * relationship validation.
 */
export async function assignableRolesFilter({
  id,
  req,
  user,
}: FilterOptionsProps): Promise<boolean | Where> {
  // No user means an internal `overrideAccess: true` operation — seeding,
  // `registerFirstUser`, and the `syncUsersOnRoleChange` re-sync all run this
  // way. `filterOptions` validation ignores `overrideAccess` entirely, and a
  // `false` return marks EVERY submitted value invalid, so returning `false`
  // here makes a fresh database impossible to seed. Returning `true` is safe:
  // `createManageableUsers`/`updateManageableUsers` already deny anonymous
  // requests at the collection level, so no external caller reaches this
  // branch.
  if (!user) return true
  if (isSuperAdmin(user)) return true

  const level = getUserRoleLevel(user)
  if (level <= 0) return false

  const clauses: Where[] = [{ level: { less_than: level } }]

  // On update, keep the role the document already carries assignable so an
  // unrelated edit does not trip validation. On create there is no `id` and
  // only the level rule applies.
  if (id !== undefined && id !== null && req?.payload) {
    try {
      const existing = await req.payload.findByID({
        collection: 'users',
        id,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const currentRoleId = relationshipId((existing as { role?: unknown } | null)?.role)
      if (currentRoleId !== undefined) {
        clauses.push({ id: { equals: currentRoleId } })
      }
    } catch {
      // Unreadable target (deleted mid-request): fall through to the level
      // rule alone, which fails closed.
    }
  }

  return clauses.length === 1 ? clauses[0] : { or: clauses }
}
