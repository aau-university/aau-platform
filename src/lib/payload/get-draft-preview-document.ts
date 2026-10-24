import type { CollectionSlug, DataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Locale } from '@/i18n/locale'
import type { User } from '@/payload-types'

function isPayloadAccessMiss(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { isOperational?: unknown; name?: unknown; status?: unknown }

  // Next's standalone bundle can contain a different Payload module instance
  // than the Local API operation, so `instanceof Forbidden/NotFound` is not
  // reliable across that boundary and production minification can shorten the
  // class name. APIError's stable public contract marks the error operational
  // and exposes its HTTP status; require both so unrelated infrastructure
  // errors remain visible to the Preview route as 500s.
  return (
    (candidate.name === 'Forbidden' && candidate.status === 403) ||
    (candidate.name === 'NotFound' && candidate.status === 404) ||
    (candidate.isOperational === true &&
      (candidate.status === 403 || candidate.status === 404))
  )
}

/**
 * The only data-access primitive for a Redis-session-bound draft document.
 *
 * Route parameters are public routing hints, never draft identity. Payload
 * therefore resolves the latest version by the trusted server-side document ID and
 * re-runs collection access for the freshly authenticated user.
 */
export async function getDraftPreviewDocument<TCollection extends CollectionSlug>(args: {
  collection: TCollection
  depth?: number
  documentId: number | string
  locale?: Locale
  user: User
}): Promise<DataFromCollectionSlug<TCollection> | null> {
  const payload = await getPayload({ config: configPromise })

  try {
    return await payload.findByID({
      collection: args.collection,
      id: args.documentId,
      depth: args.depth ?? 1,
      draft: true,
      locale: args.locale,
      overrideAccess: false,
      user: args.user,
    })
  } catch (error) {
    if (isPayloadAccessMiss(error)) return null
    throw error
  }
}
