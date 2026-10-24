import type { Where } from 'payload'
import type { HomeFallbackNewsItem } from '@/lib/fallback/home-fallback-data'
import type { Locale } from '@/i18n/locale'
import type { News, User } from '@/payload-types'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import { PUBLISHED_WHERE } from './query-helpers'
import type { ContentReadContext } from './content-read-context'

// ── Types ────────────────────────────────────────────────────────

export interface PublicNewsItem {
  id: string
  title: string
  slug: string
  summary: string
  image: string | null
  publishDate: string
  categoryName: string
  tags: string[]
  views: number
  collegeName: string | null
  authors: Array<{ id: string; name: string }>
}

export interface PublicNewsDetail extends PublicNewsItem {
  content: News['content'] | null
  meta?: News['meta']
}

export interface GetPublicNewsListOptions {
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
}

export interface GetPublicNewsDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}

// ── Helper Mappers ───────────────────────────────────────────────

function mapNewsItem(doc: News): PublicNewsItem {
  const publishedAt = doc.publishedAt as unknown
  const publishDate =
    typeof publishedAt === 'string'
      ? publishedAt
      : publishedAt instanceof Date
        ? publishedAt.toISOString()
        : ''

  // Resolve category name
  let categoryName = ''
  if (doc.category && typeof doc.category === 'object' && 'name' in doc.category) {
    categoryName = typeof doc.category.name === 'string' ? doc.category.name : ''
  }

  // Resolve tags
  const tags = Array.isArray(doc.tags)
    ? doc.tags
        .map((t) =>
          t && typeof t === 'object' && 'tag' in t && typeof t.tag === 'string' ? t.tag : '',
        )
        .filter(Boolean)
    : []

  // Resolve college name
  let collegeName = ''
  if (doc.college && typeof doc.college === 'object' && 'name' in doc.college) {
    collegeName = typeof doc.college.name === 'string' ? doc.college.name : ''
  }

  // Resolve authors
  const authors = Array.isArray(doc.populatedAuthors)
    ? doc.populatedAuthors
        .map((a) => ({
          id: a?.userId ? String(a.userId) : '',
          name: a?.name ? String(a.name) : '',
        }))
        .filter((a) => a.id && a.name)
    : []

  return {
    id: String(doc.id ?? ''),
    title: doc.title || '',
    slug: doc.slug || String(doc.id ?? ''),
    summary: richTextToPlainText(doc.summary),
    image: resolveMediaUrl(doc.featuredImage) ?? resolveMediaUrl(doc.image) ?? null,
    publishDate,
    categoryName,
    tags,
    views: typeof doc.views === 'number' ? doc.views : 0,
    collegeName: collegeName || null,
    authors,
  }
}

function mapNewsDetail(doc: News): PublicNewsDetail {
  return {
    ...mapNewsItem(doc),
    content: doc.content ?? null,
    meta: doc.meta,
  }
}

// ── Loaders ──────────────────────────────────────────────────────

/**
 * Shared DB-fetch helper for published news (Issue #44).
 *
 * `getPublicNews` (homepage, ≤8, fallback) and `getPublicNewsList`
 * (paginated, no fallback) previously each duplicated the
 * `payload.find({ collection: 'news', where: PUBLISHED_WHERE, sort:
 * '-publishedAt', depth: 1, overrideAccess: false, ... })` call. This helper
 * centralises the common fetch so the two loaders differ only in their
 * `limit`/`page` inputs and their return-type mapping.
 *
 * Returns `{ docs, totalPages }` — `totalPages` is `0` when the payload is
 * unavailable or the query fails (callers decide whether to surface a
 * fallback or an empty list).
 */
async function findNewsDocs(options: {
  limit: number
  page?: number
  locale: Locale
  readContext?: ContentReadContext
}): Promise<{ docs: News[]; totalPages: number }> {
  const payload = await getPayloadSafe()
  if (!payload) return { docs: [], totalPages: 0 }

  const result = await payload.find({
    collection: 'news',
    where: options.readContext?.draft ? undefined : PUBLISHED_WHERE,
    sort: '-publishedAt',
    limit: options.limit,
    ...(options.page !== undefined ? { page: options.page } : {}),
    depth: 1,
    locale: options.locale,
    overrideAccess: false,
    draft: options.readContext?.draft ?? false,
    ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
  })

  return { docs: result.docs as News[], totalPages: result.totalPages }
}

/**
 * Homepage news loader — returns a flat list capped at 8 items, or an
 * empty list when Payload is unreachable or has no published news (the
 * NewsGrid renders nothing for an empty list; the old fake-news fallback
 * was removed).
 *
 * Issue #44 — the DB fetch is shared with {@link getPublicNewsList} via
 * {@link findPublishedNewsDocs}. This loader only owns the limit clamp
 * and `HomeFallbackNewsItem` mapping.
 */
export async function getPublicNews(
  options: { limit?: number; locale?: Locale; readContext?: ContentReadContext } = {},
): Promise<HomeFallbackNewsItem[]> {
  if (options.readContext?.draft) return queryNewsItems(options)
  return getPublishedNewsItems({ limit: options.limit, locale: options.locale })
}

async function getPublishedNewsItems(
  options: { limit?: number; locale?: Locale },
): Promise<HomeFallbackNewsItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('news'))

  const limit = Math.max(1, Math.min(8, Math.trunc(options.limit ?? 4)))
  const locale = options.locale ?? 'ar'

  try {
    return queryNewsItems({ limit, locale })
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

async function queryNewsItems(
  options: { limit?: number; locale?: Locale; readContext?: ContentReadContext },
): Promise<HomeFallbackNewsItem[]> {
  const limit = Math.max(1, Math.min(8, Math.trunc(options.limit ?? 4)))
  const locale = options.locale ?? 'ar'

  try {
    const { docs } = await findNewsDocs({ limit, locale, readContext: options.readContext })

    return docs.map((doc: News): HomeFallbackNewsItem => {
      const item = mapNewsItem(doc)
      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        image: item.image,
        publishDate: item.publishDate,
      }
    })
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

/**
 * Paginated news list loader for the `/news` route — returns full
 * `PublicNewsItem` view-models (no fallback; the caller renders an
 * `EmptyState` when the list is empty).
 *
 * Issue #44 — the DB fetch is shared with {@link getPublicNews} via
 * {@link findPublishedNewsDocs}. This loader only owns the pagination
 * defaults and the `{ items, totalPages }` envelope.
 */
export async function getPublicNewsList(
  options: GetPublicNewsListOptions = {},
): Promise<{ items: PublicNewsItem[]; totalPages: number }> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('news'))

  const limit = options.limit ?? 9
  const page = options.page ?? 1
  const locale = options.locale ?? 'ar'

  try {
    const { docs, totalPages } = await findNewsDocs({
      limit,
      page,
      locale,
    })

    return {
      items: docs.map((doc: News) => mapNewsItem(doc)),
      totalPages,
    }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return { items: [], totalPages: 0 }
  }
}

/**
 * Loader for news detail page by slug.
 */
export async function getNewsBySlug(
  slug: string,
  options: GetPublicNewsDetailOptions = {},
): Promise<PublicNewsDetail | null> {
  if (options.draft) return queryNewsBySlug(slug, options)
  return getPublishedNewsBySlug(slug, options.locale)
}

async function getPublishedNewsBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicNewsDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('news'))
  return queryNewsBySlug(slug, { locale })
}

async function queryNewsBySlug(
  slug: string,
  options: GetPublicNewsDetailOptions,
): Promise<PublicNewsDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'news',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapNewsDetail(draftDoc as News) : null
    }

    const where: Where = {
      and: [PUBLISHED_WHERE, { slug: { equals: slug } }],
    }

    const result = await payload.find({
      collection: 'news',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as News | undefined
    return doc ? mapNewsDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
