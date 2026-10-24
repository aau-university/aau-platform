import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { REDIRECTS_CACHE_TAG } from '@/lib/payload/cache-tag-names'

/**
 * Expire the official redirects collection's public cache immediately.
 * Route mutations must not serve a previous redirect while revalidating.
 */
async function revalidateRedirects(req: PayloadRequest): Promise<void> {
  if (req.context?.disableRevalidate === true) return

  try {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(REDIRECTS_CACHE_TAG, { expire: 0 })
  } catch (error) {
    const candidate = error instanceof Error ? error : new Error('Unknown redirect cache error')
    req.payload.logger.error({
      err: { message: candidate.message, name: candidate.name },
      cacheTag: REDIRECTS_CACHE_TAG,
      operation: 'revalidate-redirects',
      subsystem: 'cache',
    })
  }
}

export const revalidateRedirectsAfterChange: CollectionAfterChangeHook =
  ({ req }) => revalidateRedirects(req)

export const revalidateRedirectsAfterDelete: CollectionAfterDeleteHook =
  ({ req }) => revalidateRedirects(req)
