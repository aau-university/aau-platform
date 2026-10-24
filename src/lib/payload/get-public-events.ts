import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { Event, User } from '@/payload-types'

import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export interface PublicEventItem {
  id: string
  title: string
  slug: string
  description: string
  eventDate: string
  location: string
  organizer: string
  image: string | null
  category: string
  collegeName: string | null
}

export interface PublicEventDetail extends PublicEventItem {
  /** Raw Lexical JSON for RichText renderer */
  descriptionRaw: Event['description'] | null
  meta?: Event['meta']
}

export interface GetPublicEventsOptions {
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
  /**
   * Restrict by event date relative to now:
   * - 'upcoming' — eventDate >= now, soonest first
   * - 'past'     — eventDate < now, most recent first
   * Omit for all events sorted most-recent-first (legacy behavior).
   */
  timeframe?: 'upcoming' | 'past'
}

function timeframeQuery(timeframe?: 'upcoming' | 'past'): {
  where: Where
  sort: string
} {
  if (!timeframe) return { where: PUBLISHED_WHERE, sort: '-eventDate' }
  // Bucket "now" to the start of the current hour. A raw `new Date()` inside
  // a `'use cache'` loader freezes at cache-fill time (a finished event can
  // linger in "upcoming" for the whole cache life) and changes on every
  // revalidation. The hour bucket keeps the boundary fresh within the hour
  // while giving repeated fills an identical, stable where clause.
  const bucketed = new Date()
  bucketed.setMinutes(0, 0, 0)
  const now = bucketed.toISOString()
  return timeframe === 'upcoming'
    ? {
        where: { and: [PUBLISHED_WHERE, { eventDate: { greater_than_equal: now } }] },
        sort: 'eventDate',
      }
    : { where: { and: [PUBLISHED_WHERE, { eventDate: { less_than: now } }] }, sort: '-eventDate' }
}

export interface GetPublicEventDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapEventDoc(doc: Event): PublicEventItem {
  const categoryObj =
    doc.category && typeof doc.category === 'object'
      ? (doc.category as { name?: unknown })
      : undefined
  const categoryName = typeof categoryObj?.name === 'string' ? categoryObj.name : ''

  const collegeObj =
    doc.college && typeof doc.college === 'object'
      ? (doc.college as { title?: unknown; name?: unknown })
      : undefined
  const collegeName =
    (typeof collegeObj?.title === 'string' && collegeObj.title) ||
    (typeof collegeObj?.name === 'string' && collegeObj.name) ||
    null

  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    description: richTextToPlainText(doc.description),
    eventDate: typeof doc.eventDate === 'string' ? doc.eventDate : '',
    location: typeof doc.location === 'string' ? doc.location : '',
    organizer: typeof doc.organizer === 'string' ? doc.organizer : '',
    image: resolveMediaUrl(doc.image) ?? null,
    category: categoryName,
    collegeName,
  }
}

// ── List Loader ───────────────────────────────────────────────────────────────

/**
 * Shared DB fetch for the published-events list — `getPublicEvents` and
 * `getPublicEventsPaged` previously duplicated this find() body verbatim
 * (same drift risk news solved with `findPublishedNewsDocs`); they now
 * differ only in their return envelope.
 *
 * Events uses Payload's built-in draft `_status` (from `versions.drafts`).
 * The legacy `isPublished` checkbox was removed in Issue #34 — `_status`
 * is now the single source of truth.
 */
async function findEvents(options: GetPublicEventsOptions) {
  const payload = await getPayloadSafe()
  if (!payload) return null

  const { where: publicWhere, sort } = timeframeQuery(options.timeframe)
  const where = options.readContext?.draft
    ? options.timeframe
      ? timeframeQueryWithoutPublication(options.timeframe)
      : undefined
    : publicWhere
  const queryOpts = buildPublicQueryOptions({ ...options, sort, depth: 1 })
  return payload.find({
    collection: 'events',
    where,
    ...queryOpts,
    draft: options.readContext?.draft ?? false,
    ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
  })
}

function timeframeQueryWithoutPublication(timeframe: 'upcoming' | 'past'): Where {
  const bucketed = new Date()
  bucketed.setMinutes(0, 0, 0)
  const now = bucketed.toISOString()
  return timeframe === 'upcoming'
    ? { eventDate: { greater_than_equal: now } }
    : { eventDate: { less_than: now } }
}

export async function getPublicEvents(
  options: GetPublicEventsOptions = {},
): Promise<PublicEventItem[]> {
  if (options.readContext?.draft) return queryEventItems(options)
  return getPublishedEventItems({
    limit: options.limit,
    locale: options.locale,
    page: options.page,
    timeframe: options.timeframe,
  })
}

async function getPublishedEventItems(
  options: Omit<GetPublicEventsOptions, 'readContext'>,
): Promise<PublicEventItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('events'))

  try {
    return queryEventItems(options)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

async function queryEventItems(options: GetPublicEventsOptions): Promise<PublicEventItem[]> {
  try {
    const result = await findEvents(options)
    if (!result) return []
    return result.docs.map((doc: Event): PublicEventItem => mapEventDoc(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export interface PublicEventsPage {
  events: PublicEventItem[]
  totalPages: number
}

/**
 * Paginated variant of `getPublicEvents` for the `/events` listing route.
 * Returns Payload's real `totalPages` so the pagination component can
 * render actual page links instead of guessing from the page size.
 */
export async function getPublicEventsPaged(
  options: GetPublicEventsOptions = {},
): Promise<PublicEventsPage> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('events'))

  try {
    const result = await findEvents(options)
    if (!result) return { events: [], totalPages: 1 }
    return {
      events: result.docs.map((doc: Event): PublicEventItem => mapEventDoc(doc)),
      totalPages: Math.max(1, result.totalPages ?? 1),
    }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return { events: [], totalPages: 1 }
  }
}

// ── Detail Loader ─────────────────────────────────────────────────────────────

export async function getPublicEventBySlug(
  slug: string,
  options: GetPublicEventDetailOptions = {},
): Promise<PublicEventDetail | null> {
  if (options.draft) return queryEventBySlug(slug, options)
  return getPublishedEventBySlug(slug, options.locale)
}

async function getPublishedEventBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicEventDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('events'))
  return queryEventBySlug(slug, { locale })
}

async function queryEventBySlug(
  slug: string,
  options: GetPublicEventDetailOptions,
): Promise<PublicEventDetail | null> {
  const { locale, draft = false } = options

  const payload = await getPayloadSafe()
  if (!payload) return null

  try {
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'events',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      if (!draftDoc) return null
      const base = mapEventDoc(draftDoc as Event)
      return {
        ...base,
        descriptionRaw: draftDoc.description ?? null,
        meta: draftDoc.meta,
      }
    }

    const result = await payload.find({
      collection: 'events',
      where: {
        and: [{ slug: { equals: slug } }, PUBLISHED_WHERE],
      },
      limit: 1,
      depth: 1,
      draft,
      overrideAccess: false,
      user: options.user,
      ...(locale ? { locale } : {}),
    })

    const doc = result.docs[0] as Event | undefined
    if (!doc) return null

    const base = mapEventDoc(doc)

    return {
      ...base,
      descriptionRaw: doc.description ?? null,
      meta: doc.meta,
    }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
