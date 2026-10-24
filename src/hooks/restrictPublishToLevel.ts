import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { hasRoleLevelAtLeast } from '../access'

/**
 * Refuse a publish or unpublish by a user below `minLevel`.
 *
 * ## Why this is a hook and not field access on `_status`
 *
 * The obvious implementation — `{ name: '_status', access: { update: … } }` —
 * is not merely ineffective, it is actively harmful, and it fails silently.
 * Payload's field-access layer does not reject a denied write; it drops it and
 * substitutes the stored value (`fields/hooks/beforeValidate/promise.js`):
 *
 *     if (!result) {
 *       delete siblingData[field.name]
 *     }
 *     if (typeof siblingData[field.name] === 'undefined' …) {
 *       siblingData[field.name] = await getFallbackValue({ field, req, siblingDoc })
 *     }
 *
 * `_status` is not an occasionally-edited field like the `isActive` checkbox it
 * replaced — `collections/operations/utilities/update.js` injects
 * `data._status = 'draft'` on **every** draft save. So denying it produced
 * three silent failures rather than one guarantee:
 *
 *   1. Publish and Unpublish appeared to succeed and did nothing. The value was
 *      stripped, refilled from the current document, and the operation reported
 *      success — no error anywhere.
 *   2. Every autosave of a published document recorded its draft version as
 *      `_status: 'published'`, so the Versions tab misreported which revision
 *      was live.
 *   3. Because those version rows looked published, the autosave guard in
 *      `hooks/revalidatePublicCache.ts` — whose whole purpose is to suppress
 *      autosave churn — fell through and purged the entire public cache on
 *      every autosave tick while a coordinator typed.
 *      (That guard reads `previousDoc`, which is also the latest version, so
 *      the FIRST autosave after a publish still looks like an unpublish and
 *      still purges once. Avoiding repeated purges during an editing session is
 *      the fix here; distinguishing that first autosave from a real unpublish
 *      needs the request's draft flag, which `afterChange` is not given.)
 *
 * A hook that throws is the right mechanism: the caller learns the write was
 * refused, and nothing is silently rewritten.
 *
 * ## What counts as a publish
 *
 * Only a change to what the PUBLIC sees. Two things are therefore excluded.
 *
 * A draft save never touches the published row — Payload writes it to the
 * collection's `_versions` table — so `_status: 'draft'` arriving as part of an
 * autosave must not be blocked. The signal is the request's own `draft` flag,
 * exactly what `collections/endpoints/updateByID.js` reads to decide the same
 * thing:
 *
 *     const { autosave, depth, draft, … } = parseParams(req.query)
 *
 * Re-publishing an already-published document does not change its visibility.
 * For Colleges, collection update access separately checks
 * `colleges.manage` and pins a Coordinator to their own college, so that
 * Coordinator may intentionally publish or unpublish only that document.
 *
 * ## Why the comparison reads the row rather than `originalDoc`
 *
 * `originalDoc` is NOT the published document. On a collection with drafts
 * Payload builds it from `getLatestCollectionVersion`, so after any autosave it
 * is the latest *draft*. Comparing against it made an ordinary content save by
 * a coordinator look like `published → draft` and get refused — verified
 * against a running server, which returned 403 on exactly the save the rule is
 * meant to allow. `db.findOne` reads the collection's own table, bypassing the
 * version indirection, and is only reached on a non-draft save by a
 * below-threshold user — never on the autosave path.
 */
export function restrictPublishToLevel(minLevel: number): CollectionBeforeChangeHook {
  return async ({ collection, data, operation, originalDoc, req }) => {
    // No user means a trusted system operation such as seeding. Those calls
    // run with `overrideAccess: true` and are governed by their own callers.
    if (!req.user) return data

    if (hasRoleLevelAtLeast(req.user, minLevel)) return data

    const incoming = (data as { _status?: unknown })._status

    // `?draft=true` alone does NOT mean the published row is safe. Payload's
    // own condition is:
    //
    //   const isSavingDraft = Boolean(draftArg && hasDraftsEnabled(collection))
    //     && data._status !== 'published' && !publishAllLocales
    //
    // so `draft=true` carrying `_status: 'published'` falls through to
    // `db.updateOne` and publishes the document for real. The draft flag must
    // therefore never bypass this hook for a below-threshold user. The
    // `!publishAllLocales` term needs no mirroring here: Payload derives it as
    // `!draftArg && …`, so it is always false on this branch.
    const query = req.query as { draft?: unknown } | undefined
    const isDraftSave =
      (query?.draft === true || query?.draft === 'true') && incoming !== 'published'
    if (isDraftSave) return data

    if (typeof incoming !== 'string') return data

    const refuse = () => {
      throw new APIError(
        'You do not have permission to publish or unpublish this document.',
        403,
      )
    }

    // Nothing is published yet, so creating something already public is a
    // publish. Colleges separately gate create at Content Manager+; this
    // remains defense in depth for any below-threshold caller.
    if (operation === 'create') {
      if (incoming === 'published') refuse()
      return data
    }

    const id = (originalDoc as { id?: number | string } | undefined)?.id
    if (id === undefined) return data

    const stored = await req.payload.db.findOne({
      collection: collection.slug,
      where: { id: { equals: id } },
      req,
    })
    const visibleNow = (stored as { _status?: unknown } | null)?._status

    if (incoming !== visibleNow) refuse()

    return data
  }
}
