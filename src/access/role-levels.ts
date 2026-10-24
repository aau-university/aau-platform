/**
 * Role level constants for hierarchy comparison.
 * Higher number = more privileges.
 *
 * NOTE: these are the *canonical* levels used when a Role document's `level`
 * cannot be resolved (e.g. relationship is just an ID and was not populated).
 * Roles documents in the DB also carry a `level` column; that value should be
 * preferred when available.
 *
 * @deprecated Retires in PR-055 once the `Roles` collection is the sole source
 * of truth for levels. Kept here for the transitional period where access code
 * may receive a JWT that only carries a slug.
 */
export const ROLE_LEVELS: Record<string, number> = {
  super_admin: 5,
  admin: 4,
  content_manager: 3,
  coordinator: 2,
  student: 1,
  doctor: 1,
} as const

export type UserRole = keyof typeof ROLE_LEVELS
