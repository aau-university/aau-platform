import type { Access, Where } from 'payload'

/**
 * Template-pattern access function: authenticated users see everything,
 * anonymous users see only `isPublished: true` documents.
 *
 * Parity variant of `authenticatedOrPublished` for collections that still
 * use the legacy `isPublished` boolean field (rather than the Payload-native
 * `_status` draft/publish workflow).
 *
 * @legacy This function will be removed once all collections migrate to
 * drafts/versions and `_status`. Prefer `authenticatedOrPublished` for new
 * collections.
 */
export const authenticatedOrActive: Access = ({ req }): true | Where =>
  req.user ? true : { isPublished: { equals: true } }
