import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { PUBLISHED_WHERE } from '@/access/published'
import {
  applyPublicCacheTags,
  collectionCacheTag,
} from '@/lib/payload/cache-tags'
import { resolveCollectionPath } from '@/utilities/collectionRoutes'
import { sitemapCacheTag } from '@/lib/payload/cache-tag-names'

export type SitemapEntry = {
  lastModified?: string
  path: string
}

type SitemapCollection = 'blog-posts' | 'events' | 'news' | 'pages'

async function querySitemapCollection(
  collection: SitemapCollection,
): Promise<SitemapEntry[]> {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection,
    depth: 0,
    draft: false,
    limit: 0,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
      updatedAt: true,
    },
    where: PUBLISHED_WHERE,
  })

  return result.docs.flatMap((doc) => {
    const path = resolveCollectionPath(collection, doc)
    if (!path) return []
    return [{
      lastModified:
        typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
      path,
    }]
  })
}

export async function getPagesSitemapData(): Promise<SitemapEntry[]> {
  'use cache'
  applyPublicCacheTags(collectionCacheTag('pages'), sitemapCacheTag('pages'))
  return querySitemapCollection('pages')
}

export async function getNewsSitemapData(): Promise<SitemapEntry[]> {
  'use cache'
  applyPublicCacheTags(collectionCacheTag('news'), sitemapCacheTag('news'))
  return querySitemapCollection('news')
}

export async function getEventsSitemapData(): Promise<SitemapEntry[]> {
  'use cache'
  applyPublicCacheTags(collectionCacheTag('events'), sitemapCacheTag('events'))
  return querySitemapCollection('events')
}

export async function getBlogSitemapData(): Promise<SitemapEntry[]> {
  'use cache'
  applyPublicCacheTags(
    collectionCacheTag('blog-posts'),
    sitemapCacheTag('blog-posts'),
  )
  return querySitemapCollection('blog-posts')
}
