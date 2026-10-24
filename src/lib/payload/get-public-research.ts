import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { ResearchPublication, User } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'
import type { RelationshipID } from './relationship-ids'

export interface PublicResearchArticleItem {
  id: string
  title: string
  slug: string
  author: string
  summary: string
  image: string | null
  categoryName: string
  tags: string[]
  publishDate: string
  displayOrder: number
}

export interface PublicResearchArticleDetail extends PublicResearchArticleItem {
  content: ResearchPublication['content'] | null
}

export interface GetPublicResearchArticlesOptions {
  categoryIds?: RelationshipID[]
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
}

export interface GetPublicResearchArticleDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}


function resolveCategoryName(
  category: ResearchPublication['category'],
): string {
  if (!category || typeof category !== 'object') return ''
  const name = (category as { name?: unknown }).name
  return typeof name === 'string' ? name : ''
}

function resolveTags(tags: ResearchPublication['tags']): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || !('tag' in entry)) return ''
      const tag = (entry as { tag?: unknown }).tag
      return typeof tag === 'string' ? tag : ''
    })
    .filter((tag) => tag.length > 0)
}

function mapListItem(doc: ResearchPublication): PublicResearchArticleItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    author: typeof doc.author === 'string' ? doc.author : '',
    summary: typeof doc.summary === 'string' ? doc.summary : '',
    image: resolveMediaUrl(doc.image) ?? null,
    categoryName: resolveCategoryName(doc.category),
    tags: resolveTags(doc.tags),
    publishDate: typeof doc.publishDate === 'string' ? doc.publishDate : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

function mapDetail(doc: ResearchPublication): PublicResearchArticleDetail {
  return {
    ...mapListItem(doc),
    content: doc.content ?? null,
  }
}

export async function getPublicResearchArticles(
  options: GetPublicResearchArticlesOptions = {},
): Promise<PublicResearchArticleItem[]> {
  if (options.readContext?.draft) return queryResearchItems(options)
  return getPublishedResearchItems({ categoryIds: options.categoryIds, limit: options.limit, locale: options.locale })
}

async function getPublishedResearchItems(options: Omit<GetPublicResearchArticlesOptions, 'readContext'>): Promise<PublicResearchArticleItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('research-publications'))
  return queryResearchItems(options)
}

async function queryResearchItems(options: GetPublicResearchArticlesOptions): Promise<PublicResearchArticleItem[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: '-publishDate',
      depth: 1,
    })
    const statusWhere = options.readContext?.draft ? null : PUBLISHED_WHERE
    const where = options.categoryIds?.length
      ? {
          and: [
            ...(statusWhere ? [statusWhere] : []),
            { category: { in: options.categoryIds } },
          ],
        }
      : statusWhere ?? undefined

    const result = await payload.find({
      collection: 'research-publications',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: ResearchPublication) =>
      mapListItem(doc),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getResearchArticleBySlug(
  slug: string,
  options: GetPublicResearchArticleDetailOptions = {},
): Promise<PublicResearchArticleDetail | null> {
  if (options.draft) return queryResearchArticleBySlug(slug, options)
  return getPublishedResearchArticleBySlug(slug, options.locale)
}

async function getPublishedResearchArticleBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicResearchArticleDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('research-publications'))
  return queryResearchArticleBySlug(slug, { locale })
}

async function queryResearchArticleBySlug(
  slug: string,
  options: GetPublicResearchArticleDetailOptions,
): Promise<PublicResearchArticleDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'research-publications',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapDetail(draftDoc as ResearchPublication) : null
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const where: Where = { and: [PUBLISHED_WHERE, { slug: { equals: slug } }] }
    const result = await payload.find({
      collection: 'research-publications',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as ResearchPublication | undefined
    return doc ? mapDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
