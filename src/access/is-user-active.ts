/**
 * Returns true when the user is explicitly flagged as active.
 *
 * Fails CLOSED: a missing/NULL `isActive` counts as inactive. The old
 * fail-open default existed only as a transitional bridge for rows created
 * before the field existed; with no legacy user base that bridge is a
 * privilege hole (a half-provisioned or incompletely-suspended account
 * stayed active). `Users.isActive` has `defaultValue: true`, so every
 * account created through Payload carries an explicit flag.
 */
export function isUserActive(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  return (user as Record<string, unknown>).isActive === true
}
