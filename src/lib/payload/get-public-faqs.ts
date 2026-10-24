import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { Faq } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export interface PublicFAQItem {
  id: string
  question: string
  answer: string
  category: string
  displayOrder: number
}

export interface GetPublicFAQsOptions {
  limit?: number
  locale?: Locale
  page?: number
  category?: string
  readContext?: ContentReadContext
}

export async function getPublicFAQs(options: GetPublicFAQsOptions = {}): Promise<PublicFAQItem[]> {
  if (options.readContext?.draft) return queryFAQItems(options)
  return getPublishedFAQItems({ category: options.category, limit: options.limit, locale: options.locale, page: options.page })
}

async function getPublishedFAQItems(options: Omit<GetPublicFAQsOptions, 'readContext'>): Promise<PublicFAQItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('faqs'))
  return queryFAQItems(options)
}

async function queryFAQItems(options: GetPublicFAQsOptions): Promise<PublicFAQItem[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const baseOpts = buildPublicQueryOptions({ ...options, sort: 'displayOrder', depth: 0 })
    // FAQs uses Payload's built-in draft `_status` (from
    // `versions.drafts`). The legacy `isPublished` checkbox was removed
    // in Issue #34 — `_status` is now the single source of truth.
    const statusWhere = options.readContext?.draft ? null : PUBLISHED_WHERE
    const where: Where | undefined = options.category
      ? {
          and: [...(statusWhere ? [statusWhere] : []), { category: { equals: options.category } }],
        }
      : statusWhere ?? undefined

    const result = await payload.find({
      collection: 'faqs',
      where,
      ...baseOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map(
      (doc: Faq): PublicFAQItem => ({
        id: String(doc.id ?? ''),
        question: typeof doc.question === 'string' ? doc.question : '',
        answer:
          typeof doc.answer === 'object' && doc.answer !== null
            ? richTextToPlainText(doc.answer)
            : typeof doc.answer === 'string'
              ? doc.answer
              : '',
        category: typeof doc.category === 'string' ? doc.category : '',
        displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}
