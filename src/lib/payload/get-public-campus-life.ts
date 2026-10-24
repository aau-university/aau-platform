import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { CampusLife, User } from '@/payload-types'

import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

/**
 * Public view model for a CampusLife list card.
 *
 * Derived from the generated {@link CampusLife} type via plain field picks
 * so the public page never re-declares Payload document types.
 */
export interface PublicCampusLifeItem {
  id: string
  title: string
  slug: string
  kind: 'life' | 'activity' | null
  summary: string
  image: string | null
  publishedAt: string
  displayOrder: number
}

/**
 * Public view model for the CampusLife detail page. Mirrors the list item
 * plus the rich-text body and the sidebar/highlights arrays.
 */
export interface PublicCampusLifeDetail extends PublicCampusLifeItem {
  content: CampusLife['content'] | null
  sidebarTitle: string
  highlightsTitle: string
  highlights: Array<{ highlight: string }>
  stats: Array<{ value: number; label: string }>
  sidebarNote: string
}

export interface GetPublicCampusLifeOptions {
  limit?: number
  locale?: Locale
  readContext?: ContentReadContext
  page?: number
  kind?: 'life' | 'activity'
}

export interface GetPublicCampusLifeDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}


function mapListItem(doc: CampusLife): PublicCampusLifeItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    kind:
      doc.kind === 'life' || doc.kind === 'activity' ? doc.kind : null,
    summary: richTextToPlainText(doc.content),
    image: resolveMediaUrl(doc.image) ?? null,
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

function mapDetail(doc: CampusLife): PublicCampusLifeDetail {
  return {
    ...mapListItem(doc),
    content: doc.content ?? null,
    sidebarTitle: typeof doc.sidebarTitle === 'string' ? doc.sidebarTitle : '',
    highlightsTitle:
      typeof doc.highlightsTitle === 'string' ? doc.highlightsTitle : '',
    highlights: Array.isArray(doc.highlights)
      ? doc.highlights
          .map((entry) =>
            entry && typeof entry === 'object' && 'highlight' in entry
              ? {
                  highlight:
                    typeof (entry as { highlight?: unknown }).highlight ===
                    'string'
                      ? (entry as { highlight: string }).highlight
                      : '',
                }
              : { highlight: '' },
          )
          .filter((entry) => entry.highlight.length > 0)
      : [],
    stats: Array.isArray(doc.stats)
      ? doc.stats
          .map((entry) =>
            entry && typeof entry === 'object' && 'value' in entry && 'label' in entry
              ? {
                  value:
                    typeof (entry as { value?: unknown }).value === 'number'
                      ? (entry as { value: number }).value
                      : 0,
                  label:
                    typeof (entry as { label?: unknown }).label === 'string'
                      ? (entry as { label: string }).label
                      : '',
                }
              : { value: 0, label: '' },
          )
          .filter((entry) => entry.label.length > 0)
      : [],
    sidebarNote:
      typeof doc.sidebarNote === 'string' ? doc.sidebarNote : '',
  }
}

export async function getPublicCampusLife(
  options: GetPublicCampusLifeOptions = {},
): Promise<PublicCampusLifeItem[]> {
  if (options.readContext?.draft) return queryCampusLifeItems(options)
  return getPublishedCampusLifeItems({ kind: options.kind, limit: options.limit, locale: options.locale })
}

async function getPublishedCampusLifeItems(options: Omit<GetPublicCampusLifeOptions, 'readContext'>): Promise<PublicCampusLifeItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('campus-life'))
  return queryCampusLifeItems(options)
}

async function queryCampusLifeItems(options: GetPublicCampusLifeOptions): Promise<PublicCampusLifeItem[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: 'displayOrder',
      depth: 1,
    })
    const statusWhere = options.readContext?.draft ? null : PUBLISHED_WHERE
    const where = options.kind
      ? {
          and: [...(statusWhere ? [statusWhere] : []), { kind: { equals: options.kind } }],
        }
      : statusWhere ?? undefined

    const result = await payload.find({
      collection: 'campus-life',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: CampusLife) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCampusLifeBySlug(
  slug: string,
  options: GetPublicCampusLifeDetailOptions = {},
): Promise<PublicCampusLifeDetail | null> {
  if (options.draft) return queryCampusLifeBySlug(slug, options)
  return getPublishedCampusLifeBySlug(slug, options.locale)
}

async function getPublishedCampusLifeBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicCampusLifeDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('campus-life'))
  return queryCampusLifeBySlug(slug, { locale })
}

async function queryCampusLifeBySlug(
  slug: string,
  options: GetPublicCampusLifeDetailOptions,
): Promise<PublicCampusLifeDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'campus-life',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapDetail(draftDoc as CampusLife) : null
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const where: Where = { and: [PUBLISHED_WHERE, { slug: { equals: slug } }] }
    const result = await payload.find({
      collection: 'campus-life',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as CampusLife | undefined
    return doc ? mapDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
