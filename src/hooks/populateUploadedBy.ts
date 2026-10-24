import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Stamp new media documents with the authenticated uploader.
 *
 * The `uploadedBy` field is never client-writable (field access denies
 * create/update), so this hook is its single source of truth: on create
 * with an authenticated request the acting user is pinned, and any
 * client-supplied value is discarded. Server-side contexts without a user
 * (seed, scripts running with overrideAccess) leave the field empty rather
 * than inventing an owner.
 *
 * On update the stored owner is preserved — ownership never transfers.
 */
export const populateUploadedBy: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    return { ...data, uploadedBy: req.user ? req.user.id : null }
  }

  if (operation === 'update' && originalDoc?.uploadedBy !== undefined) {
    const original = originalDoc.uploadedBy
    const originalId =
      original && typeof original === 'object'
        ? (original as { id?: unknown }).id
        : original
    return { ...data, uploadedBy: originalId ?? null }
  }

  return data
}
