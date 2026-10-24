import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

import {
  collectionCacheTag,
  globalCacheTag,
  pageCacheTag,
  PUBLIC_CACHE_TAG,
  sitemapCacheTag,
} from '@/lib/payload/cache-tag-names'
import {
  hasCollectionDetailRoute,
  resolveCollectionRevalidationPathsWithRelationships,
} from '@/utilities/collectionRoutes'
import { syncManagedRedirects } from '@/hooks/managedRedirectLifecycle'
import {
  captureNestedRouteDependentsBeforeDelete,
  syncCollegeRouteDependents,
  syncProgramRouteDependents,
} from '@/hooks/syncNestedRouteDependents'

const PUBLIC_ROW_SNAPSHOTS = '__publicRowSnapshots'
const VERSION_ONLY_UPDATES = '__publicVersionOnlyUpdates'

type UnpublishSnapshotStore = Record<string, Record<string, Record<string, unknown>>>
type VersionOnlyUpdateStore = Record<string, Record<string, true>>

function snapshotStore(context: Record<string, unknown>): UnpublishSnapshotStore {
  const existing = context[PUBLIC_ROW_SNAPSHOTS]
  if (existing && typeof existing === 'object') {
    return existing as UnpublishSnapshotStore
  }
  const created: UnpublishSnapshotStore = {}
  context[PUBLIC_ROW_SNAPSHOTS] = created
  return created
}

function existingSnapshotStore(
  context: Record<string, unknown>,
): UnpublishSnapshotStore | undefined {
  const existing = context[PUBLIC_ROW_SNAPSHOTS]
  return existing && typeof existing === 'object'
    ? (existing as UnpublishSnapshotStore)
    : undefined
}

function existingVersionOnlyUpdateStore(
  context: Record<string, unknown>,
): VersionOnlyUpdateStore | undefined {
  const existing = context[VERSION_ONLY_UPDATES]
  return existing && typeof existing === 'object'
    ? (existing as VersionOnlyUpdateStore)
    : undefined
}

function versionOnlyUpdateStore(context: Record<string, unknown>): VersionOnlyUpdateStore {
  const existing = existingVersionOnlyUpdateStore(context)
  if (existing) return existing
  const created: VersionOnlyUpdateStore = {}
  context[VERSION_ONLY_UPDATES] = created
  return created
}

function markVersionOnlyUpdate(
  context: Record<string, unknown>,
  collection: string,
  id: unknown,
): void {
  if (typeof id !== 'number' && typeof id !== 'string') return
  const store = versionOnlyUpdateStore(context)
  const collectionStore = store[collection] ?? {}
  collectionStore[String(id)] = true
  store[collection] = collectionStore
}

function clearVersionOnlyUpdate(
  context: Record<string, unknown>,
  collection: string,
  id: unknown,
): void {
  if (typeof id !== 'number' && typeof id !== 'string') return
  const store = existingVersionOnlyUpdateStore(context)
  const collectionStore = store?.[collection]
  if (!store || !collectionStore) return

  delete collectionStore[String(id)]
  if (Object.keys(collectionStore).length === 0) delete store[collection]
  if (Object.keys(store).length === 0) delete context[VERSION_ONLY_UPDATES]
}

function consumeVersionOnlyUpdate(
  context: Record<string, unknown>,
  collection: string,
  doc: unknown,
): boolean {
  const store = existingVersionOnlyUpdateStore(context)
  const collectionStore = store?.[collection]

  if (!store || !collectionStore || !doc || typeof doc !== 'object') return false
  const id = (doc as { id?: unknown }).id
  if (typeof id !== 'number' && typeof id !== 'string') return false

  const key = String(id)
  if (collectionStore[key] !== true) return false

  // Per-document markers represent exactly one version-only afterChange. They
  // must not suppress a later publish that reuses the same req.context.
  delete collectionStore[key]
  if (Object.keys(collectionStore).length === 0) delete store[collection]
  if (Object.keys(store).length === 0) delete context[VERSION_ONLY_UPDATES]
  return true
}

/**
 * Payload does not pass `unpublishAllLocales` to `afterChange`, and
 * `previousDoc` is the latest version (often an autosave draft), not the
 * published row. Capture the public row before the operation so unpublish can
 * invalidate its exact route without treating ordinary autosaves as public
 * mutations.
 */
export const capturePublicUnpublish: CollectionBeforeOperationHook = async ({
  args,
  collection,
  context,
  operation,
  req,
}) => {
  if (operation !== 'update') return
  if (context.disableRevalidate) return

  const data =
    'data' in args && args.data && typeof args.data === 'object'
      ? (args.data as Record<string, unknown>)
      : {}
  const draft = 'draft' in args && args.draft === true
  const publishAllLocalesValue: unknown =
    'publishAllLocales' in args ? args.publishAllLocales : undefined
  const publishAllLocales = publishAllLocalesValue === true || publishAllLocalesValue === 'true'
  const unpublishAllLocalesValue: unknown =
    'unpublishAllLocales' in args ? args.unpublishAllLocales : undefined
  const unpublishAllLocales =
    unpublishAllLocalesValue === true || unpublishAllLocalesValue === 'true'

  // Match Payload 3.86.0's `isSavingDraft`: these operations only write a
  // version and cannot change the public main row. Avoid the extra database
  // read on every autosave (and on an explicit Save Draft).
  const savesVersionOnly =
    draft && data._status !== 'published' && !publishAllLocales && !unpublishAllLocales
  if (savesVersionOnly) {
    const id = 'id' in args ? args.id : undefined
    if (typeof id === 'number' || typeof id === 'string') {
      markVersionOnlyUpdate(context, collection.slug, id)
      return
    }

    // A bulk update has one beforeOperation followed by one afterChange per
    // document. Resolve its IDs once so each callback consumes only its own
    // marker; a later publish reusing req.context is never suppressed.
    const where = 'where' in args ? args.where : undefined
    if (!where) return
    const result = await req.payload.db.find({
      collection: collection.slug,
      limit: 0,
      pagination: false,
      req,
      where,
    })
    for (const doc of result.docs) {
      markVersionOnlyUpdate(context, collection.slug, (doc as { id?: unknown }).id)
    }
    return
  }

  const id = 'id' in args ? args.id : undefined
  if (id != null) {
    // A real main-row mutation supersedes any marker left by an autosave that
    // failed after beforeOperation and therefore never reached afterChange.
    clearVersionOnlyUpdate(context, collection.slug, id)
    const publishedDoc = await req.payload.db.findOne({
      collection: collection.slug,
      req,
      where: { id: { equals: id } },
    })
    if (docStatus(publishedDoc) === 'published') {
      const store = snapshotStore(context)
      store[collection.slug] ??= {}
      store[collection.slug][String(id)] = publishedDoc as Record<string, unknown>
    }
    return
  }

  // Payload's bulk update operation runs this hook once, then invokes each
  // document's afterChange hook with the shared request context. Snapshot all
  // matching public rows so every affected document invalidates its exact old
  // route even when the latest version is an autosave draft.
  const where = 'where' in args ? args.where : undefined
  if (!where) return
  const result = await req.payload.db.find({
    collection: collection.slug,
    limit: 0,
    pagination: false,
    req,
    where,
  })
  for (const publishedDoc of result.docs) {
    const publishedId = (publishedDoc as { id?: unknown }).id
    clearVersionOnlyUpdate(context, collection.slug, publishedId)
    if (docStatus(publishedDoc) !== 'published') continue
    if (typeof publishedId === 'number' || typeof publishedId === 'string') {
      const store = snapshotStore(context)
      store[collection.slug] ??= {}
      store[collection.slug][String(publishedId)] = publishedDoc as Record<string, unknown>
    }
  }
}

export function withPublicUnpublishCapture(collection: CollectionConfig): CollectionConfig {
  const versions = collection.versions
  const hasDrafts =
    versions !== undefined &&
    versions !== false &&
    typeof versions === 'object' &&
    Boolean(versions.drafts)

  // Only draft-enabled collections can have a published main row hidden by a
  // newer version. Avoid attaching database-reading publication hooks to
  // Users, Roles, Media, and other collections without Drafts.
  if (!hasDrafts) return collection

  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeDelete: [
        captureNestedRouteDependentsBeforeDelete,
        ...(collection.hooks?.beforeDelete ?? []),
      ],
      beforeOperation: [capturePublicUnpublish, ...(collection.hooks?.beforeOperation ?? [])],
    },
  }
}

function consumeCapturedPublishedDoc(
  context: Record<string, unknown>,
  collection: string,
  doc: unknown,
): Record<string, unknown> | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  const id = (doc as { id?: unknown }).id
  if (typeof id !== 'number' && typeof id !== 'string') return undefined
  const store = existingSnapshotStore(context)
  const collectionStore = store?.[collection]
  if (!store || !collectionStore) return undefined

  const key = String(id)
  const captured = collectionStore[key]
  if (!captured) return undefined

  delete collectionStore[key]
  if (Object.keys(collectionStore).length === 0) delete store[collection]
  if (Object.keys(store).length === 0) delete context[PUBLIC_ROW_SNAPSHOTS]
  return captured
}

type MutationLogContext = {
  collection: string
  documentId?: number | string
  operation: string
  path?: string
  tag?: string
  subsystem?: 'cache' | 'redirects'
}

function requestCorrelationId(req: PayloadRequest): string | undefined {
  const requestId = (req as PayloadRequest & { id?: unknown }).id
  if (typeof requestId === 'string' && requestId) return requestId
  const headerId = req.headers?.get?.('x-request-id')
  return headerId || undefined
}

function logInfrastructureFailure(
  req: PayloadRequest,
  context: MutationLogContext,
  error: unknown,
): void {
  const normalized =
    error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error), name: 'UnknownError' }
  req.payload.logger.error({
    ...context,
    correlationId: requestCorrelationId(req),
    error: normalized,
    msg: 'Public content infrastructure operation failed',
    subsystem: context.subsystem ?? 'cache',
    userId:
      req.user && (typeof req.user.id === 'number' || typeof req.user.id === 'string')
        ? String(req.user.id)
        : undefined,
  })
}

async function revalidateTags(
  tags: string[],
  req: PayloadRequest,
  context: Omit<MutationLogContext, 'tag'>,
): Promise<void> {
  let revalidateTag: (tag: string, profile: { expire: number }) => unknown
  try {
    ;({ revalidateTag } = await import('next/cache'))
  } catch (err) {
    logInfrastructureFailure(req, context, err)
    return
  }

  for (const tag of tags) {
    try {
      // Payload collection/global hooks are CMS mutation webhooks. Public
      // reads after publish or unpublish must block on fresh data instead of
      // serving the stale-while-revalidate response produced by `max`.
      revalidateTag(tag, { expire: 0 })
    } catch (err) {
      logInfrastructureFailure(req, { ...context, tag }, err)
    }
  }
}

async function revalidatePathSafe(
  path: string,
  req: PayloadRequest,
  context: Omit<MutationLogContext, 'path'>,
): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath(path)
  } catch (err) {
    logInfrastructureFailure(req, { ...context, path }, err)
  }
}

function pageTags(doc: unknown): string[] {
  if (!doc || typeof doc !== 'object') return []
  const slug = (doc as { slug?: unknown }).slug
  return typeof slug === 'string' && slug ? [pageCacheTag(slug)] : []
}

/** Extracts Payload's `_status` field ('draft' | 'published') from a doc. */
function docStatus(doc: unknown): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  const status = (doc as { _status?: unknown })._status
  return typeof status === 'string' ? status : undefined
}

async function resolvePublicPaths(
  collection: string,
  doc: unknown,
  req: PayloadRequest,
): Promise<string[]> {
  if (!doc || typeof doc !== 'object') return []

  try {
    return await resolveCollectionRevalidationPathsWithRelationships(
      collection,
      doc as Record<string, unknown>,
      async (relationCollection, id) => {
        const relation = await req.payload.findByID({
          collection: relationCollection,
          id,
          depth: 0,
          overrideAccess: true,
          req,
          select: { slug: true },
        })
        return typeof relation.slug === 'string' ? relation.slug : null
      },
    )
  } catch (error) {
    logInfrastructureFailure(
      req,
      {
        collection,
        documentId:
          typeof (doc as { id?: unknown }).id === 'number' ||
          typeof (doc as { id?: unknown }).id === 'string'
            ? (doc as { id: number | string }).id
            : undefined,
        operation: 'resolve-route',
      },
      error,
    )
    return []
  }
}

async function revalidateResolvedPaths(
  paths: Array<string | null>,
  req: PayloadRequest,
  context: Omit<MutationLogContext, 'path'>,
): Promise<void> {
  for (const path of new Set(paths.filter((value): value is string => Boolean(value)))) {
    await revalidatePathSafe(path, req, context)
  }
}

export function revalidatePublicCollection(slug: string): {
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  return {
    afterChange: async ({ doc, previousDoc, context, operation, req }) => {
      // Allow callers (seeders, importers, migrations) to bypass cache
      // invalidation by setting `context.disableRevalidate = true` on the
      // request. Payload propagates `req.context` to every hook invocation.
      if (consumeVersionOnlyUpdate(context, slug, doc)) return
      if (context.disableRevalidate) return

      // Draft autosaves never affect the public surface. Publish, unpublish,
      // and edits to an already-published document do.
      const currentStatus = docStatus(doc)
      const previousStatus = docStatus(previousDoc)
      const publishedBeforeChange = consumeCapturedPublishedDoc(context, slug, doc)
      if (currentStatus && currentStatus !== 'published') {
        if (previousStatus !== 'published' && !publishedBeforeChange) return
      }

      const mutationContext = {
        collection: slug,
        documentId:
          doc && (typeof doc.id === 'number' || typeof doc.id === 'string') ? doc.id : undefined,
        operation,
      }
      await revalidateTags(
        [
          PUBLIC_CACHE_TAG,
          collectionCacheTag(slug),
          sitemapCacheTag(slug),
          ...pageTags(doc),
          ...pageTags(publishedBeforeChange),
        ],
        req,
        mutationContext,
      )

      const currentPaths =
        !currentStatus || currentStatus === 'published'
          ? await resolvePublicPaths(slug, doc, req)
          : []
      const previousPublicDoc = publishedBeforeChange ?? previousDoc
      const previousPublicStatus = docStatus(previousPublicDoc)
      const previousPaths =
        previousPublicDoc && (!previousPublicStatus || previousPublicStatus === 'published')
          ? await resolvePublicPaths(slug, previousPublicDoc, req)
          : []

      if (hasCollectionDetailRoute(slug) && mutationContext.documentId != null) {
        const pathCount = Math.max(currentPaths.length, previousPaths.length)
        for (let index = 0; index < pathCount; index += 1) {
          try {
            await syncManagedRedirects({
              collection: slug,
              currentPath: currentPaths[index] ?? null,
              documentId: mutationContext.documentId,
              isPublic: !currentStatus || currentStatus === 'published',
              previousPath: previousPaths[index] ?? null,
              req,
              routeKey: index === 0 ? 'detail' : `dependent:${index}`,
            })
          } catch (error) {
            logInfrastructureFailure(
              req,
              {
                ...mutationContext,
                operation: 'sync-redirects',
                subsystem: 'redirects',
              },
              error,
            )
          }
        }
      }

      let dependentPaths: string[] = []
      if (slug === 'colleges' && mutationContext.documentId != null) {
        try {
          dependentPaths = await syncCollegeRouteDependents({
            collegeId: mutationContext.documentId,
            currentCollegePath: currentPaths[0] ?? null,
            isPublic: !currentStatus || currentStatus === 'published',
            previousCollegePath: previousPaths[0] ?? null,
            req,
          })
        } catch (error) {
          logInfrastructureFailure(
            req,
            {
              ...mutationContext,
              operation: 'sync-dependent-redirects',
              subsystem: 'redirects',
            },
            error,
          )
        }
      }
      if (slug === 'academic-programs' && mutationContext.documentId != null) {
        try {
          dependentPaths = await syncProgramRouteDependents({
            currentProgramPath: currentPaths[0] ?? null,
            isPublic: !currentStatus || currentStatus === 'published',
            previousProgramPath: previousPaths[0] ?? null,
            programId: mutationContext.documentId,
            req,
          })
        } catch (error) {
          logInfrastructureFailure(
            req,
            {
              ...mutationContext,
              operation: 'sync-dependent-redirects',
              subsystem: 'redirects',
            },
            error,
          )
        }
      }

      await revalidateResolvedPaths(
        [...currentPaths, ...previousPaths, ...dependentPaths],
        req,
        mutationContext,
      )
    },
    afterDelete: async ({ doc, context, req }) => {
      if (context.disableRevalidate) return
      const mutationContext = {
        collection: slug,
        documentId:
          doc && (typeof doc.id === 'number' || typeof doc.id === 'string') ? doc.id : undefined,
        operation: 'delete',
      }
      await revalidateTags(
        [PUBLIC_CACHE_TAG, collectionCacheTag(slug), sitemapCacheTag(slug), ...pageTags(doc)],
        req,
        mutationContext,
      )
      const deletedPaths = await resolvePublicPaths(slug, doc, req)
      if (hasCollectionDetailRoute(slug) && mutationContext.documentId != null) {
        for (let index = 0; index < deletedPaths.length; index += 1) {
          try {
            await syncManagedRedirects({
              collection: slug,
              currentPath: null,
              documentId: mutationContext.documentId,
              isPublic: false,
              previousPath: deletedPaths[index] ?? null,
              req,
              routeKey: index === 0 ? 'detail' : `dependent:${index}`,
            })
          } catch (error) {
            logInfrastructureFailure(
              req,
              {
                ...mutationContext,
                operation: 'sync-redirects',
                subsystem: 'redirects',
              },
              error,
            )
          }
        }
      }
      let dependentPaths: string[] = []
      if (slug === 'colleges' && mutationContext.documentId != null) {
        try {
          dependentPaths = await syncCollegeRouteDependents({
            collegeId: mutationContext.documentId,
            currentCollegePath: null,
            isPublic: false,
            previousCollegePath: deletedPaths[0] ?? null,
            req,
          })
        } catch (error) {
          logInfrastructureFailure(
            req,
            {
              ...mutationContext,
              operation: 'sync-dependent-redirects',
              subsystem: 'redirects',
            },
            error,
          )
        }
      }
      if (slug === 'academic-programs' && mutationContext.documentId != null) {
        try {
          dependentPaths = await syncProgramRouteDependents({
            currentProgramPath: null,
            isPublic: false,
            previousProgramPath: deletedPaths[0] ?? null,
            programId: mutationContext.documentId,
            req,
          })
        } catch (error) {
          logInfrastructureFailure(
            req,
            {
              ...mutationContext,
              operation: 'sync-dependent-redirects',
              subsystem: 'redirects',
            },
            error,
          )
        }
      }
      await revalidateResolvedPaths([...deletedPaths, ...dependentPaths], req, mutationContext)
    },
  }
}

export function revalidatePublicGlobal(slug: string): GlobalAfterChangeHook {
  return async ({ context, req }) => {
    // Same bypass as the collection variant: seeders/importers/migrations
    // set `context.disableRevalidate` to skip cache invalidation outside
    // a request scope.
    if (context?.disableRevalidate) return
    await revalidateTags([PUBLIC_CACHE_TAG, globalCacheTag(slug)], req, {
      collection: slug,
      operation: 'global-update',
    })
  }
}
