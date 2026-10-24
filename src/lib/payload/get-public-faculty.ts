import type { Locale } from '@/i18n/locale'
import type { FacultyMember, User } from '@/payload-types'
import type { Where } from 'payload'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { publishedRelation, publishedWithRelations } from './query-helpers'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export interface PublicFacultyListOptions {
  /** Optional college slug to scope the list to. */
  collegeSlug?: string
  /** Optional program slug to scope the list to. */
  programSlug?: string
  limit?: number
  locale?: Locale
  selectedIds?: Array<string | number>
  readContext?: ContentReadContext
}

export interface PublicFacultyDetailOptions {
  locale?: Locale
  user?: User
  /**
   * Set from Next.js draft mode so an editor previewing an unpublished
   * profile sees their draft. Off for every public visitor.
   */
  draft?: boolean
  documentId?: number | string
}

/**
 * Fetch active faculty members as raw `FacultyMember` documents.
 *
 * Returns docs with `depth: 1` so `photo`, `college`, `program`, and
 * `department` relationships are populated — the list page renders the
 * member's photo via `<Media>` and links to the parent college.
 *
 * Pass `collegeSlug` or `programSlug` to scope the list; omit both to
 * return all active faculty (the `/faculty` route's default behaviour).
 *
 * Returns an empty array when Payload is unreachable; the caller renders
 * `<EmptyState>` in that case.
 */
export async function getPublicFacultyList(
  options: PublicFacultyListOptions = {},
): Promise<FacultyMember[]> {
  if (options.readContext?.draft) return queryFacultyItems(options)
  return getPublishedFacultyItems({
    collegeSlug: options.collegeSlug,
    limit: options.limit,
    locale: options.locale,
    programSlug: options.programSlug,
    selectedIds: options.selectedIds,
  })
}

async function getPublishedFacultyItems(options: Omit<PublicFacultyListOptions, 'readContext'>): Promise<FacultyMember[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('faculty-members'))
  return queryFacultyItems(options)
}

async function queryFacultyItems(options: PublicFacultyListOptions): Promise<FacultyMember[]> {
  const locale = options.locale ?? 'ar'
  // Route-bound list pages intentionally allow larger result sets than the
  // homepage blocks. Clamp to a sane upper bound to avoid unbounded queries.
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 100)))

  try {
    const payload = await getPayloadSafe()
    if (!payload) return []

    const andClauses: Where[] = options.readContext?.draft ? [] : [publishedWithRelations('college')]

    if (options.selectedIds && options.selectedIds.length > 0) {
      andClauses.push({ id: { in: options.selectedIds } })
    }

    // Relationship-path scoping: a single query replaces the legacy
    // resolve-slug-then-filter chains (two extra sequential round-trips).
    // A slug that matches no active college/program simply yields zero
    // rows — the same empty-list outcome as the old early return.
    if (options.collegeSlug) {
      andClauses.push({ 'college.slug': { equals: options.collegeSlug } })
    }

    if (options.programSlug) {
      andClauses.push({ 'program.slug': { equals: options.programSlug } })
      if (!options.readContext?.draft) {
        andClauses.push(publishedRelation('program'))
        andClauses.push(publishedRelation('program.college'))
      }
    }

    const result = await payload.find({
      collection: 'faculty-members',
      where: andClauses.length > 0 ? { and: andClauses } : undefined,
      limit,
      depth: 1,
      locale,
      sort: 'fullName',
      overrideAccess: false,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs as FacultyMember[]
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

/**
 * Fetch a single active faculty member by slug.
 *
 * Returns the raw `FacultyMember` document with `depth: 1` so the detail
 * page can render `biography` via `<RichText>`, the `photo` via `<Media>`,
 * and the `college` / `program` relationships in the breadcrumb. The
 * nested arrays (`education`, `experience`, `publications`, `courses`)
 * are part of the document itself (no relationship depth needed).
 *
 * Returns `null` when no doc matches or Payload is unreachable; the
 * caller renders `notFound()` in that case.
 */
export async function getPublicFacultyBySlug(
  slug: string,
  options: PublicFacultyDetailOptions = {},
): Promise<FacultyMember | null> {
  if (options.draft) return queryFacultyBySlug(slug, options)
  return getPublishedFacultyBySlug(slug, options.locale)
}

async function getPublishedFacultyBySlug(
  slug: string,
  locale?: Locale,
): Promise<FacultyMember | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('faculty-members'))
  return queryFacultyBySlug(slug, { locale })
}

async function queryFacultyBySlug(
  slug: string,
  options: PublicFacultyDetailOptions,
): Promise<FacultyMember | null> {
  const locale = options.locale ?? 'ar'

  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      return await getDraftPreviewDocument({
        collection: 'faculty-members',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const result = await payload.find({
      collection: 'faculty-members',
      where: {
        and: [{ slug: { equals: slug } }, publishedWithRelations('college')],
      },
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return (result.docs[0] as FacultyMember | undefined) ?? null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
