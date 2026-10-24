import type { Config } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

import { globalCacheTag } from '@/lib/payload/cache-tags'

type Global = keyof Config['globals']

type GlobalData<T extends Global> = Config['globals'][T]

/**
 * Fetch a single Payload global by slug.
 */
async function getGlobal<T extends Global>(
  slug: T,
  depth = 2,
): Promise<GlobalData<T>> {
  const payload = await getPayload({ config: configPromise })
  return (await payload.findGlobal({ slug, depth })) as GlobalData<T>
}

/**
 * Cached single-global fetcher. Cache is tagged with
 * `payload:global:<slug>` so `revalidateTag(globalCacheTag(slug))` flushes
 * the entry.
 */
export const getCachedGlobal = <T extends Global>(slug: T, depth = 2) =>
  unstable_cache(
    async () => getGlobal<T>(slug, depth),
    [slug, `depth:${depth}`],
    {
      tags: [globalCacheTag(slug)],
    },
  )

/**
 * Fetch multiple globals in one call. Returns `{ [slug]: data }`. Each
 * requested global is fetched in parallel.
 *
 * This is the convenience entry point used by route loaders that need
 * several globals at once (e.g. site header + footer + contact settings).
 */
export async function getGlobals<T extends Global>(
  slugs: readonly T[],
  depth = 2,
): Promise<{ [K in T]: GlobalData<K> }> {
  const payload = await getPayload({ config: configPromise })

  const entries = await Promise.all(
    slugs.map(async (slug) => {
      const data = await payload.findGlobal({ slug, depth })
      return [slug, data] as const
    }),
  )

  return Object.fromEntries(entries) as unknown as { [K in T]: GlobalData<K> }
}

/**
 * Cached multi-global fetcher. Cache is keyed by the joined slug list and
 * tagged with every requested `payload:global:<slug>` tag.
 */
export const getCachedGlobals = <T extends Global>(
  slugs: readonly T[],
  depth = 2,
) =>
  unstable_cache(
    async () => getGlobals(slugs, depth),
    [...slugs, `depth:${depth}`],
    {
      tags: slugs.map((slug) => globalCacheTag(slug)),
    },
  )

export { getGlobal }
