import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cacheLife, cacheTag } from 'next/cache'

import type { Redirect } from '@/payload-types'
import { REDIRECTS_CACHE_TAG } from '@/lib/payload/cache-tag-names'

export async function getCachedRedirects(depth = 2): Promise<Redirect[]> {
  'use cache'

  cacheLife('minutes')
  cacheTag(REDIRECTS_CACHE_TAG)
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'redirects',
    depth,
    limit: 0,
    overrideAccess: false,
    pagination: false,
    where: {
      disabled: { not_equals: true },
    },
  })

  return docs as Redirect[]
}

export const getRedirects = getCachedRedirects
export default getCachedRedirects
