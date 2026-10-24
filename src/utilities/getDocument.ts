import type { Config } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

import { collectionCacheTag, globalCacheTag } from '@/lib/payload/cache-tags'

type Collection = keyof Config['collections']

async function getDocument<T extends Collection>(
  collection: T,
  slug: string,
  depth = 2,
): Promise<Config['collections'][T] | null> {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection,
    depth,
    limit: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return (result.docs[0] as Config['collections'][T] | undefined) ?? null
}

/**
 * Cached {@link getDocument}. Cache is keyed by collection + slug and tagged
 * with both the collection-level tag (`payload:collection:<slug>`) and the
 * shared `payload:global:pages` invalidation bucket so a single
 * `revalidateTag(globalCacheTag('pages'))` flushes every page-shaped doc.
 */
export const getCachedDocument = <T extends Collection>(
  collection: T,
  slug: string,
  depth = 2,
) =>
  unstable_cache(
    async () => getDocument<T>(collection, slug, depth),
    [collection, slug, `depth:${depth}`],
    {
      tags: [collectionCacheTag(collection), globalCacheTag('pages')],
    },
  )

export { getDocument }
export default getDocument
