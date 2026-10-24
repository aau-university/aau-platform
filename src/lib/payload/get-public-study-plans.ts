import type { Locale } from '@/i18n/locale'
import type { StudyPlan, User } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { buildPublicQueryOptions, publishedWithRelations } from './query-helpers'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'
import { getDraftPreviewDocument } from './get-draft-preview-document'

export interface GetPublicStudyPlansOptions {
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
}

// Study Plans now have `versions.drafts`, so `_status` is the publishing
// field and `PUBLISHED_WHERE` is the correct filter.
//
// A-02 recorded the opposite state: a `_status` filter against a collection
// that had no such field. Payload rejects an unknown field path outright, so
// the loader fell into its catch branch on every call and the StudyPlansGrid
// block silently rendered nothing. That failure mode is why the shared
// `PUBLISHED_WHERE` / `buildActiveWhere` split is documented in
// `query-helpers.ts` — the filter has to match the collection's actual
// publishing mechanism, and there is now one place that says which is which.

export async function getPublicStudyPlans(
  options: GetPublicStudyPlansOptions = {},
): Promise<StudyPlan[]> {
  if (options.readContext?.draft) return queryStudyPlanItems(options)
  return getPublishedStudyPlanItems({
    limit: options.limit,
    locale: options.locale,
    page: options.page,
  })
}

async function getPublishedStudyPlanItems(
  options: Omit<GetPublicStudyPlansOptions, 'readContext'>,
): Promise<StudyPlan[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('study-plans'))
  return queryStudyPlanItems(options)
}

async function queryStudyPlanItems(options: GetPublicStudyPlansOptions): Promise<StudyPlan[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: '-createdAt',
      depth: 1,
    })

    const result = await payload.find({
      collection: 'study-plans',
      where: options.readContext?.draft
        ? undefined
        : publishedWithRelations('academicProgram', 'academicProgram.college'),
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs as StudyPlan[]
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export interface GetProgramStudyPlanOptions {
  locale?: Locale
  user?: User
  /**
   * Set from Next.js draft mode so an editor previewing an unpublished
   * document sees their draft. Off for every public visitor.
   */
  draft?: boolean
  documentId?: number | string
}

/**
 * Fetch the one study plan owned by a single academic program.
 *
 * `programId` is the program's numeric id (the program-detail route
 * resolves the URL slug to an id before calling this). Returns the plan
 * with `depth: 1` so `academicProgram` / `college` references are
 * populated for breadcrumbs, or `null` when the program has no active
 * plan yet — the route renders that as a friendly empty state, not a 404.
 * `academicProgram` is database-unique, so `limit: 1` expresses the schema
 * contract rather than choosing arbitrarily between unordered documents.
 */
export async function getProgramStudyPlan(
  programId: number | string,
  options: GetProgramStudyPlanOptions = {},
): Promise<StudyPlan | null> {
  if (options.draft) return queryProgramStudyPlan(programId, options)
  return getPublishedProgramStudyPlan(programId, options.locale)
}

async function getPublishedProgramStudyPlan(
  programId: number | string,
  locale?: Locale,
): Promise<StudyPlan | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('study-plans'))
  return queryProgramStudyPlan(programId, { locale })
}

async function queryProgramStudyPlan(
  programId: number | string,
  options: GetProgramStudyPlanOptions,
): Promise<StudyPlan | null> {
  if (options.draft && options.documentId != null && options.user) {
    return await getDraftPreviewDocument({
      collection: 'study-plans',
      documentId: options.documentId,
      depth: 2,
      locale: options.locale,
      user: options.user,
    })
  }

  const payload = await getPayloadSafe()
  if (!payload) return null

  const numericId = typeof programId === 'number' ? programId : Number(programId)
  if (!Number.isFinite(numericId)) return null

  try {
    const draft = options.draft ?? false
    const result = await payload.find({
      collection: 'study-plans',
      where: draft
        ? { academicProgram: { equals: numericId } }
        : {
            and: [
              { academicProgram: { equals: numericId } },
              publishedWithRelations('academicProgram', 'academicProgram.college'),
            ],
          },
      limit: 1,
      depth: 1,
      locale: options.locale ?? 'ar',
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return (result.docs[0] as StudyPlan | undefined) ?? null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
