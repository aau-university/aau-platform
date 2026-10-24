import type { Locale } from '@/i18n/locale'
import type { Announcement } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export interface GetPublicAnnouncementsOptions {
  limit?: number
  locale?: Locale
  page?: number
  readContext?: ContentReadContext
}


export async function getPublicAnnouncements(
  options: GetPublicAnnouncementsOptions = {},
): Promise<Announcement[]> {
  if (options.readContext?.draft) return queryAnnouncementItems(options)
  return getPublishedAnnouncementItems({ limit: options.limit, locale: options.locale, page: options.page })
}

async function getPublishedAnnouncementItems(options: Omit<GetPublicAnnouncementsOptions, 'readContext'>): Promise<Announcement[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('announcements'))
  return queryAnnouncementItems(options)
}

async function queryAnnouncementItems(options: GetPublicAnnouncementsOptions): Promise<Announcement[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: '-publishDate',
      depth: 1,
    })

    const result = await payload.find({
      collection: 'announcements',
      where: options.readContext?.draft ? undefined : PUBLISHED_WHERE,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs as Announcement[]
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}
