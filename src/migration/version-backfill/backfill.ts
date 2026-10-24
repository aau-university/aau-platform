/**
 * Canonical initial-version backfill.
 *
 * ── The condition this repairs ────────────────────────────────────────────
 * PR #25 gave five collections a draft/publish workflow and five globals an
 * audit history. Payload creates a version row when a document is SAVED, so
 * documents that already existed — every college, department, programme,
 * faculty member and study plan in the migrated Neon content — have none. The
 * 2026-09-14 staging diagnosis measured 57 documents and 0 version rows.
 *
 * For a draft-enabled collection that is not cosmetic: Payload serves the Admin
 * list view through `queryDrafts`, which reads the version table, so a document
 * with no `latest=true` row is a document the Admin cannot list.
 *
 * ── Why Payload's own machinery and not INSERT ... SELECT ─────────────────
 * A version row is not a copy of the main row. It is a separate table tree:
 * `_colleges_v`, `_colleges_v_locales`, `_colleges_v_rels`, and a child table
 * per array field, with its own id space, its own enum types and its own
 * column naming. Reconstructing that in SQL means reimplementing Payload's
 * field-to-column mapping and keeping the reimplementation in step with it
 * forever — and the first thing to break is the least visible: Arabic/English
 * locale rows and nested array ordering.
 *
 * `saveVersion` is the function Payload itself calls after every update. It is
 * handed the same `docWithLocales` shape the update operation builds, and it
 * writes through `payload.db.createVersion`, which is the code that produced
 * every version row this platform already has.
 *
 * ── Why not payload.update() ──────────────────────────────────────────────
 * `payload.update()` would also create a version, and would additionally run
 * every beforeChange/afterChange hook, re-derive slugs and SEO, touch
 * `updatedAt` on the document, revalidate Next caches, and re-upload or
 * re-process media. On a migration that is content mutation dressed up as a
 * no-op. This reads each document and writes exactly one version row.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────
 * The unit of idempotency is "this document has at least one version". A
 * document that has any version — because the backfill already ran, or because
 * an editor saved it since — is left completely alone. Re-running therefore
 * cannot produce a second canonical initial version, and cannot overwrite
 * genuine editorial history.
 */
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  saveVersion,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  BACKFILL_COLLECTIONS,
  BACKFILL_GLOBALS,
  type BackfillCollectionSlug,
  type BackfillGlobalSlug,
} from './targets'

export interface EntityBackfillResult {
  slug: string
  kind: 'collection' | 'global'
  /** Documents that had no version and now have exactly one. */
  created: number
  /** Documents left untouched because they already had a version. */
  skipped: number
  /** Documents examined. For a global this is 0 or 1. */
  examined: number
}

export interface BackfillResult {
  entities: EntityBackfillResult[]
  created: number
  skipped: number
  examined: number
}

export class BackfillConfigurationError extends Error {}

/**
 * Fail before writing anything if the configuration is not what this backfill
 * was written against. A slug that was renamed, or a collection that quietly
 * lost `versions.drafts`, would otherwise be skipped in silence — and a
 * migration that silently does less than it claims is worse than one that
 * stops.
 */
export function assertBackfillTargets(payload: Payload): void {
  const problems: string[] = []

  for (const slug of BACKFILL_COLLECTIONS) {
    const collection = payload.collections[slug]
    if (!collection) {
      problems.push(`collection '${slug}' does not exist in the Payload config`)
      continue
    }
    const versions = collection.config.versions
    if (!versions || typeof versions !== 'object' || !versions.drafts) {
      problems.push(`collection '${slug}' has no drafts-enabled versions configuration`)
    }
  }

  for (const slug of BACKFILL_GLOBALS) {
    const global = payload.config.globals.find((candidate) => candidate.slug === slug)
    if (!global) {
      problems.push(`global '${slug}' does not exist in the Payload config`)
      continue
    }
    if (!global.versions) {
      problems.push(`global '${slug}' has no versions configuration`)
    }
  }

  if (problems.length > 0) {
    throw new BackfillConfigurationError(
      `the version backfill does not match this Payload configuration:\n  ${problems.join('\n  ')}`,
    )
  }
}

/**
 * Read the document exactly as an update operation would, then write one
 * version from it.
 *
 * `payload.db.findOne` returns the document with every locale present
 * (`{ ar, en }` for localized fields) because the adapter always joins the
 * `_locales` table and keys the result by locale. That is the `docWithLocales`
 * shape `saveVersion` expects — the same value `updateByID` passes it — so
 * Arabic and English content, relationships, uploads and arrays all travel
 * through Payload's own field mapping rather than a second one written here.
 */
async function backfillCollection(
  payload: Payload,
  req: PayloadRequest,
  slug: BackfillCollectionSlug,
): Promise<EntityBackfillResult> {
  const collection = payload.collections[slug]
  if (!collection) {
    throw new BackfillConfigurationError(`collection '${slug}' disappeared mid-run`)
  }

  const result: EntityBackfillResult = { slug, kind: 'collection', created: 0, skipped: 0, examined: 0 }

  // Paged rather than fetched whole: these collections are small today, and a
  // migration runner that assumes that is a migration runner that breaks on the
  // first large one.
  const pageSize = 100
  let page = 1
  let hasMore = true

  while (hasMore) {
    const { docs, hasNextPage } = await payload.db.find({
      collection: slug,
      limit: pageSize,
      page,
      pagination: true,
      req,
      sort: 'id',
      where: {},
    })

    for (const doc of docs) {
      result.examined += 1
      const id = doc.id as number | string

      const existing = await payload.db.countVersions({
        collection: slug,
        req,
        where: { parent: { equals: id } },
      })
      if (existing.totalDocs > 0) {
        result.skipped += 1
        continue
      }

      await saveVersion({
        id,
        autosave: false,
        collection: collection.config,
        docWithLocales: doc,
        draft: false,
        payload,
        req,
        returning: false,
      })
      result.created += 1
    }

    hasMore = Boolean(hasNextPage)
    page += 1
  }

  return result
}

async function backfillGlobal(
  payload: Payload,
  req: PayloadRequest,
  slug: BackfillGlobalSlug,
): Promise<EntityBackfillResult> {
  const globalConfig = payload.config.globals.find((candidate) => candidate.slug === slug)
  if (!globalConfig) {
    throw new BackfillConfigurationError(`global '${slug}' disappeared mid-run`)
  }

  const result: EntityBackfillResult = { slug, kind: 'global', created: 0, skipped: 0, examined: 0 }

  // A global that has never been saved has no row to version. That is not a
  // failure — there is nothing to preserve and nothing for the Versions view to
  // show — but it MUST be detected, because a version written from nothing is
  // invented content that then shows up in the Versions view as a real state.
  //
  // The check is on `id` rather than on falsiness: the adapter returns an empty
  // object `{}`, not undefined, for a global with no row (measured — see
  // @payloadcms/drizzle's findGlobal, which falls through to `return {}`). An
  // `if (!doc)` here silently created an empty version for all five globals.
  const doc = await payload.db.findGlobal({ slug, req, where: {} })
  if (!doc || (doc as { id?: unknown }).id === undefined) {
    return result
  }
  result.examined = 1

  const existing = await payload.db.countGlobalVersions({ global: slug, req, where: {} })
  if (existing.totalDocs > 0) {
    result.skipped = 1
    return result
  }

  await saveVersion({
    autosave: false,
    docWithLocales: doc,
    draft: false,
    global: globalConfig,
    payload,
    req,
    returning: false,
  })
  result.created = 1

  return result
}

/**
 * Run the whole backfill inside ONE transaction.
 *
 * This runs against the scratch database immediately before it is promoted over
 * live staging, so "half of the collections have canonical versions" is a state
 * nobody should ever have to reason about. Either every document in scope gains
 * its version or the database is exactly as the schema upgrade left it, and the
 * import fails closed before promotion.
 */
export async function runVersionBackfill(payload: Payload): Promise<BackfillResult> {
  assertBackfillTargets(payload)

  const req = await createLocalReq({}, payload)
  const transactional = await initTransaction(req)

  try {
    const entities: EntityBackfillResult[] = []

    for (const slug of BACKFILL_COLLECTIONS) {
      entities.push(await backfillCollection(payload, req, slug))
    }
    for (const slug of BACKFILL_GLOBALS) {
      entities.push(await backfillGlobal(payload, req, slug))
    }

    if (transactional) {
      await commitTransaction(req)
    }

    return {
      entities,
      created: entities.reduce((total, entity) => total + entity.created, 0),
      skipped: entities.reduce((total, entity) => total + entity.skipped, 0),
      examined: entities.reduce((total, entity) => total + entity.examined, 0),
    }
  } catch (error) {
    // `killTransaction` is a no-op when no transaction was opened, so this is
    // safe on an adapter that does not support them.
    await killTransaction(req)
    throw error
  }
}
