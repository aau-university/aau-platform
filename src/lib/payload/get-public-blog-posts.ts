import type { Locale } from '@/i18n/locale'
import type { BlogPost, User } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export interface PublicBlogPostItem {
  id: string
  title: string
  slug: string
  excerpt: string
  authorName: string
  authorAvatarUrl: string | null
  category: string
  publishedAt: string
  readTime: number | null
  views: number
  image: string | null
  tags: string
}

export interface PublicBlogPostDetail extends PublicBlogPostItem {
  /** Raw Lexical JSON for RichText renderer */
  content: BlogPost['content'] | null
  meta?: BlogPost['meta']
}

export interface GetPublicBlogPostsOptions {
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
}

export interface PublicBlogPostsPage {
  items: PublicBlogPostItem[]
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  page: number
}

export interface GetPublicBlogPostDetailOptions {
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

function resolveAuthorName(doc: BlogPost): string {
  // Author display name is sourced from the privacy-safe `populatedAuthors`
  // snapshot (see `src/hooks/populateAuthors.ts`) — non-admin readers can't
  // populate the `author` relationship directly under AAU's restrictive
  // `users.read` policy. Fall back to the populated user's name when
  // available (depth-1 read), then to an empty string.
  const populated = Array.isArray(doc.populatedAuthors) ? doc.populatedAuthors : []
  const firstSnapshot =
    populated.length > 0 ? (populated[0] as { name?: unknown } | undefined) : undefined
  const authorRelationship =
    doc.author && typeof doc.author === 'object' ? (doc.author as { name?: unknown }) : undefined

  return (
    (typeof firstSnapshot?.name === 'string' && firstSnapshot.name) ||
    (typeof authorRelationship?.name === 'string' && authorRelationship.name) ||
    ''
  )
}

function mapBlogPostDoc(doc: BlogPost): PublicBlogPostItem {
  const authorName = resolveAuthorName(doc)

  const category =
    doc.category && typeof doc.category === 'object'
      ? (doc.category as { name?: unknown })
      : undefined
  const categoryName = typeof category?.name === 'string' ? category.name : ''

  // `tags` was migrated from comma-separated text to an array of
  // `{ tag: localizedText }`. Join the localized tag strings for the
  // public list view.
  const tags = Array.isArray(doc.tags)
    ? doc.tags
        .map((entry) =>
          entry && typeof entry === 'object' && 'tag' in entry
            ? String((entry as { tag?: unknown }).tag ?? '')
            : '',
        )
        .filter(Boolean)
        .join(',')
    : ''

  // Author avatar — resolve from the authorAvatar upload field
  const authorAvatarUrl = resolveMediaUrl(doc.authorAvatar) ?? null

  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: (doc.slug as string | undefined) || String(doc.id ?? ''),
    excerpt: typeof doc.excerpt === 'string' ? doc.excerpt : '',
    authorName,
    authorAvatarUrl,
    category: categoryName,
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
    readTime: typeof doc.readTime === 'number' ? doc.readTime : null,
    views: typeof doc.views === 'number' ? doc.views : 0,
    image: resolveMediaUrl(doc.image) ?? null,
    tags,
  }
}

// ── List Loader ───────────────────────────────────────────────────────────────

/**
 * Shared DB fetch for published blog posts — `getPublicBlogPosts` and
 * `getPublicBlogPostsPaged` previously duplicated this find() body verbatim
 * (same drift risk news solved with `findPublishedNewsDocs`); they now
 * differ only in their pagination inputs and return envelope.
 *
 * BlogPosts uses Payload's built-in draft `_status` (from `versions.drafts`).
 * The legacy `isPublished` checkbox was removed in Issue #34 — `_status` is
 * now the single source of truth.
 */
async function findBlogPosts(options: GetPublicBlogPostsOptions) {
  const payload = await getPayloadSafe()
  if (!payload) return null

  const queryOpts = buildPublicQueryOptions({ ...options, sort: '-publishedAt', depth: 1 })
  return payload.find({
    collection: 'blog-posts',
    where: options.readContext?.draft ? undefined : PUBLISHED_WHERE,
    ...queryOpts,
    draft: options.readContext?.draft ?? false,
    ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
  })
}

export async function getPublicBlogPosts(
  options: GetPublicBlogPostsOptions = {},
): Promise<PublicBlogPostItem[]> {
  if (options.readContext?.draft) return queryBlogPostItems(options)
  return getPublishedBlogPostItems({
    limit: options.limit,
    locale: options.locale,
    page: options.page,
  })
}

async function getPublishedBlogPostItems(
  options: Omit<GetPublicBlogPostsOptions, 'readContext'>,
): Promise<PublicBlogPostItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('blog-posts'))

  try {
    return queryBlogPostItems(options)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

async function queryBlogPostItems(
  options: GetPublicBlogPostsOptions,
): Promise<PublicBlogPostItem[]> {
  try {
    const result = await findBlogPosts(options)
    if (!result) return []
    return result.docs.map((doc: BlogPost): PublicBlogPostItem => mapBlogPostDoc(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

/** Paginated blog loader for the `/blog` listing route. */
export async function getPublicBlogPostsPaged(
  options: GetPublicBlogPostsOptions = {},
): Promise<PublicBlogPostsPage> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('blog-posts'))

  const page = options.page ?? 1

  try {
    const result = await findBlogPosts({
      ...options,
      limit: options.limit ?? 9,
      page,
    })
    if (!result) {
      return { items: [], totalDocs: 0, totalPages: 0, hasNextPage: false, page }
    }

    return {
      items: result.docs.map((doc: BlogPost): PublicBlogPostItem => mapBlogPostDoc(doc)),
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      page: result.page ?? page,
    }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return { items: [], totalDocs: 0, totalPages: 0, hasNextPage: false, page }
  }
}

// ── Detail Loader ─────────────────────────────────────────────────────────────

export async function getPublicBlogPostBySlug(
  slug: string,
  options: GetPublicBlogPostDetailOptions = {},
): Promise<PublicBlogPostDetail | null> {
  if (options.draft) return queryBlogPostBySlug(slug, options)
  return getPublishedBlogPostBySlug(slug, options.locale)
}

async function getPublishedBlogPostBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicBlogPostDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('blog-posts'))
  return queryBlogPostBySlug(slug, { locale })
}

async function queryBlogPostBySlug(
  slug: string,
  options: GetPublicBlogPostDetailOptions,
): Promise<PublicBlogPostDetail | null> {
  const { locale, draft = false } = options

  const payload = await getPayloadSafe()
  if (!payload) return null

  try {
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'blog-posts',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      if (!draftDoc) return null
      const base = mapBlogPostDoc(draftDoc as BlogPost)
      return { ...base, content: draftDoc.content ?? null, meta: draftDoc.meta }
    }

    const result = await payload.find({
      collection: 'blog-posts',
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

    const doc = result.docs[0] as BlogPost | undefined
    if (!doc) return null

    const base = mapBlogPostDoc(doc)

    return {
      ...base,
      content: doc.content ?? null,
      meta: doc.meta,
    }
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
