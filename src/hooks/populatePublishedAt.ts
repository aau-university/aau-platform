import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `populatePublishedAt` (PR-016).
 *
 * Cross-cutting `beforeChange` hook that stamps `publishedAt = new Date()`
 * the first time a doc transitions to "published". No-op otherwise (never
 * overwrites an existing `publishedAt`).
 *
 * Ports the canonical implementation from Payload's official website template
 * (`templates/website/src/hooks/populatePublishedAt.ts`).
 *
 * Attached drafts-enabled collections use Payload's `_status` field, injected
 * automatically when `versions.drafts` is enabled. The hook fires when
 * `_status === 'published'` and `publishedAt` is null.
 *
 * The hook is idempotent: a doc that already has `publishedAt` keeps its
 * original publish date even on subsequent saves / re-publishes.
 *
 * Issue #34: the legacy `isPublished` boolean branch was removed when the
 * dead `isPublished` checkbox was dropped from the 5 editorial collections.
 * `_status` is now the single source of truth for publish state.
 */
export const populatePublishedAt: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  // Already published — never overwrite.
  if (data.publishedAt) return data

  // Canonical resets intentionally clear this optional value. Keep this
  // exception narrower than ordinary seed or editorial publishing behavior.
  if (
    operation === 'update' &&
    req.context.canonicalSeedReset === true &&
    data.publishedAt === null
  ) {
    return data
  }

  // Ordinary updates cannot clear or replace an existing publication date
  // with null, including partial updates where the field is omitted.
  if (operation === 'update' && originalDoc?.publishedAt) {
    return {
      ...data,
      publishedAt: originalDoc.publishedAt,
    }
  }

  // Payload injects `_status` automatically when `versions.drafts` is
  // enabled. `'published'` means the editor clicked "Publish" (or "Save
  // draft" with `_status: 'published'` set).
  if (data._status === 'published') {
    return {
      ...data,
      publishedAt: new Date(),
    }
  }

  return data
}
