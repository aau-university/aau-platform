import type { PageLayoutBlock } from '@/blocks/types'
import type { Locale } from '@/i18n/locale'
import type { Page, User } from '@/payload-types'

import { applyPublicCacheTags, collectionCacheTag, pageCacheTag } from './cache-tags'
import { PUBLISHED_WHERE } from './query-helpers'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'

export interface PublicPage {
  id: string | number
  title?: string
  slug: string
  layout: PageLayoutBlock[]
  meta?: Page['meta']
}

export interface PublicPageOptions {
  locale?: Locale
  draft?: boolean
  documentId?: number | string
  user?: User
}

function isLayout(value: unknown): value is PageLayoutBlock[] {
  return (
    Array.isArray(value) &&
    value.every((block) => {
      if (!block || typeof block !== 'object') return false
      const blockType = (block as { blockType?: unknown }).blockType
      return typeof blockType === 'string' && blockType.length > 0
    })
  )
}

export async function getPublicPageBySlug(
  slug: string,
  options: PublicPageOptions = {},
): Promise<PublicPage | null> {
  try {
    if (options.draft) {
      if (options.documentId == null || !options.user) return null
      const doc = await getDraftPreviewDocument({
        collection: 'pages',
        documentId: options.documentId,
        depth: 1,
        locale: options.locale,
        user: options.user,
      })
      return doc ? mapPage(doc) : null
    }
    return await getPublishedPageBySlug(slug, options.locale)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}

async function getPublishedPageBySlug(slug: string, locale?: Locale): Promise<PublicPage | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('pages'), pageCacheTag(slug))
  return queryPageBySlug(slug, { locale })
}

async function queryPageBySlug(
  slug: string,
  options: PublicPageOptions,
): Promise<PublicPage | null> {
  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  const draft = options.draft ?? false
  const result = await payload.find({
    collection: 'pages',
    // Pages uses Payload's built-in draft `_status` (from
    // `versions.drafts`). The legacy `isPublished` checkbox was removed
    // in Issue #34 — `_status` is now the single source of truth.
    // `overrideAccess: false` additionally honours the
    // `authenticatedOrPublished` access control.
    where: draft
      ? { slug: { equals: slug } }
      : {
          and: [PUBLISHED_WHERE, { slug: { equals: slug } }],
        },
    limit: 1,
    depth: 1,
    locale: options.locale,
    draft,
    overrideAccess: false,
    user: options.user,
  })

  const doc = result.docs[0] as Page | undefined
  return doc ? mapPage(doc) : null
}

function mapPage(doc: Page): PublicPage {
  return {
    id: doc.id,
    title: doc.title || undefined,
    slug: doc.slug || '',
    layout: isLayout(doc.layout) ? doc.layout : [],
    meta: doc.meta,
  }
}
