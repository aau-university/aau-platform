import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { Center, User } from '@/payload-types'

import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export type PublicCenterKind = 'center' | 'service' | 'universityCenter' | null

export interface PublicCenterItem {
  id: string
  title: string
  slug: string
  kind: PublicCenterKind
  description: string
  image: string | null
  location: string
  phone: string
  email: string
  publishedAt: string
  displayOrder: number
}

export interface PublicCenterDetail extends PublicCenterItem {
  services: Center['services'] | null
  programs: Center['programs'] | null
}

export interface GetPublicCentersOptions {
  limit?: number
  locale?: Locale
  readContext?: ContentReadContext
  page?: number
  kind?: 'center' | 'service' | 'universityCenter'
}

export interface GetPublicCenterDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}


function mapKind(value: Center['kind']): PublicCenterKind {
  if (value === 'center' || value === 'service' || value === 'universityCenter') {
    return value
  }
  return null
}

function mapListItem(doc: Center): PublicCenterItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    kind: mapKind(doc.kind),
    description: richTextToPlainText(doc.description),
    image: resolveMediaUrl(doc.image) ?? null,
    location: typeof doc.location === 'string' ? doc.location : '',
    phone: typeof doc.phone === 'string' ? doc.phone : '',
    email: typeof doc.email === 'string' ? doc.email : '',
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

function mapDetail(doc: Center): PublicCenterDetail {
  return {
    ...mapListItem(doc),
    services: doc.services ?? null,
    programs: doc.programs ?? null,
  }
}

export async function getPublicCenters(
  options: GetPublicCentersOptions = {},
): Promise<PublicCenterItem[]> {
  if (options.readContext?.draft) return queryCenterItems(options)
  return getPublishedCenterItems({ kind: options.kind, limit: options.limit, locale: options.locale })
}

async function getPublishedCenterItems(options: Omit<GetPublicCentersOptions, 'readContext'>): Promise<PublicCenterItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('centers'))
  return queryCenterItems(options)
}

async function queryCenterItems(options: GetPublicCentersOptions): Promise<PublicCenterItem[]> {
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
      collection: 'centers',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: Center) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCenterBySlug(
  slug: string,
  options: GetPublicCenterDetailOptions = {},
): Promise<PublicCenterDetail | null> {
  if (options.draft) return queryCenterBySlug(slug, options)
  return getPublishedCenterBySlug(slug, options.locale)
}

async function getPublishedCenterBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicCenterDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('centers'))
  return queryCenterBySlug(slug, { locale })
}

async function queryCenterBySlug(
  slug: string,
  options: GetPublicCenterDetailOptions,
): Promise<PublicCenterDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'centers',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapDetail(draftDoc as Center) : null
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const where: Where = { and: [PUBLISHED_WHERE, { slug: { equals: slug } }] }
    const result = await payload.find({
      collection: 'centers',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as Center | undefined
    return doc ? mapDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
