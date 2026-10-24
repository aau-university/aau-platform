import type { FieldAccess } from 'payload'

import { isSuperAdmin } from './is-super-admin'

/**
 * Field-level write guard: only super-admin (level 5) can write the field.
 *
 * Mirrors the collection-level `superAdminOnly` access function but for
 * field-level `access.update` / `access.create` on privilege-critical fields
 * (e.g. systemRole on Users, canAccessPayloadAdmin on Roles).
 *
 * Added in PR-004 alongside the legacy field-access closures extracted from
 * `src/collections/Users.ts`. Currently unused by any caller — it is here to
 * give PR-017 (and future work) a reusable super-admin-only field guard.
 */
export const superAdminFieldWrite: FieldAccess = ({ req: { user } }) => {
  return Boolean(user && isSuperAdmin(user))
}
