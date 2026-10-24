import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { Offer, College, User } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'
import type { RelationshipID } from './relationship-ids'

export interface PublicOfferCollege {
  id: number
  name: string
  slug: string
}

export interface PublicOfferItem {
  id: string
  title: string
  slug: string
  description: string
  categoryName: string
  targetAudience: string
  duration: string
  location: string
  requirements: string
  validUntil: string
  applyLink: string
  image: string | null
  publishedAt: string
  displayOrder: number
  college: PublicOfferCollege | null
}

export interface PublicOfferDetail extends PublicOfferItem {
  details: Offer['details'] | null
  benefits: Offer['benefits'] | null
  interestTitle: string
  interestSubtitle: string
  interestOpenTitle: string
  interestOpenSubtitle: string
  interestHighlightsTitle: string
  interestHighlights: Array<{ highlight: string }>
  interestNotice: string
}

export interface GetPublicOffersOptions {
  categoryIds?: RelationshipID[]
  limit?: number
  locale?: Locale
  readContext?: ContentReadContext
  page?: number
}

export interface GetPublicOfferDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}


function resolveCategoryName(category: Offer['category']): string {
  if (!category || typeof category !== 'object') return ''
  const name = (category as { name?: unknown }).name
  return typeof name === 'string' ? name : ''
}

function resolveCollegeDetails(college: Offer['college']): PublicOfferCollege | null {
  if (!college || typeof college !== 'object') return null
  const id = (college as College).id
  const name = (college as College).name
  const slug = (college as College).slug
  if (typeof id === 'number' && typeof name === 'string' && typeof slug === 'string') {
    return { id, name, slug }
  }
  return null
}

function mapHighlights(
  highlights: Offer['interestHighlights'],
): Array<{ highlight: string }> {
  if (!Array.isArray(highlights)) return []
  return highlights
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || !('highlight' in entry)) {
        return null
      }
      const highlight = (entry as { highlight?: unknown }).highlight
      return typeof highlight === 'string'
        ? { highlight }
        : null
    })
    .filter((entry): entry is { highlight: string } => entry !== null)
}

function mapListItem(doc: Offer): PublicOfferItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    description: typeof doc.description === 'string' ? doc.description : '',
    categoryName: resolveCategoryName(doc.category),
    targetAudience:
      typeof doc.targetAudience === 'string' ? doc.targetAudience : '',
    duration: typeof doc.duration === 'string' ? doc.duration : '',
    location: typeof doc.location === 'string' ? doc.location : '',
    requirements:
      typeof doc.requirements === 'string' ? doc.requirements : '',
    validUntil: typeof doc.validUntil === 'string' ? doc.validUntil : '',
    applyLink: typeof doc.applyLink === 'string' ? doc.applyLink : '',
    image: resolveMediaUrl(doc.image) ?? null,
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
    college: resolveCollegeDetails(doc.college),
  }
}

function mapDetail(doc: Offer): PublicOfferDetail {
  return {
    ...mapListItem(doc),
    details: doc.details ?? null,
    benefits: doc.benefits ?? null,
    interestTitle:
      typeof doc.interestTitle === 'string' ? doc.interestTitle : '',
    interestSubtitle:
      typeof doc.interestSubtitle === 'string' ? doc.interestSubtitle : '',
    interestOpenTitle:
      typeof doc.interestOpenTitle === 'string' ? doc.interestOpenTitle : '',
    interestOpenSubtitle:
      typeof doc.interestOpenSubtitle === 'string'
        ? doc.interestOpenSubtitle
        : '',
    interestHighlightsTitle:
      typeof doc.interestHighlightsTitle === 'string'
        ? doc.interestHighlightsTitle
        : '',
    interestHighlights: mapHighlights(doc.interestHighlights),
    interestNotice:
      typeof doc.interestNotice === 'string' ? doc.interestNotice : '',
  }
}

export async function getPublicOffers(
  options: GetPublicOffersOptions = {},
): Promise<PublicOfferItem[]> {
  if (options.readContext?.draft) return queryOfferItems(options)
  return getPublishedOfferItems({ categoryIds: options.categoryIds, limit: options.limit, locale: options.locale })
}

async function getPublishedOfferItems(options: Omit<GetPublicOffersOptions, 'readContext'>): Promise<PublicOfferItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('offers'))
  return queryOfferItems(options)
}

async function queryOfferItems(options: GetPublicOffersOptions): Promise<PublicOfferItem[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: '-publishedAt',
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
      collection: 'offers',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: Offer) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getOfferBySlug(
  slug: string,
  options: GetPublicOfferDetailOptions = {},
): Promise<PublicOfferDetail | null> {
  if (options.draft) return queryOfferBySlug(slug, options)
  return getPublishedOfferBySlug(slug, options.locale)
}

async function getPublishedOfferBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicOfferDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('offers'))
  return queryOfferBySlug(slug, { locale })
}

async function queryOfferBySlug(
  slug: string,
  options: GetPublicOfferDetailOptions,
): Promise<PublicOfferDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'offers',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapDetail(draftDoc as Offer) : null
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const where: Where = { and: [PUBLISHED_WHERE, { slug: { equals: slug } }] }
    const result = await payload.find({
      collection: 'offers',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as Offer | undefined
    return doc ? mapDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
