import type { Media } from '@/payload-types'

import { getServerSideURL } from './getURL'

type MediaLike =
  | (Pick<Media, 'url' | 'updatedAt' | 'filename'> & {
      sizes?: Record<string, { url?: string | null } | null> | null
    })
  | null
  | undefined

/**
 * Build an absolute URL for a media resource and append a cache-busting query
 * based on `updatedAt` so that re-uploads bypass any upstream CDN cache.
 *
 * Accepts:
 *   - A populated media document (uses `url` + `updatedAt`)
 *   - A relative URL string (e.g. `/api/media/file/image.webp`)
 *   - `null`/`undefined` (returns empty string)
 *
 * Relationship IDs (numbers/strings) are intentionally NOT resolved here —
 * callers should fetch the relationship first. Resolving IDs inside this
 * helper would force it to be async and bind it to the Payload instance.
 */
export const getMediaUrl = (
  media: MediaLike | string | number | null | undefined,
): string => {
  if (media == null) return ''

  if (typeof media === 'string') {
    return appendCacheBust(media, null)
  }

  if (typeof media === 'number') {
    // Relationship ID — caller must populate first. Returning empty keeps
    // the function pure and avoids a silent broken-image link.
    return ''
  }

  const url = media.url
  if (!url) return ''

  const absolute = url.startsWith('http://') || url.startsWith('https://') ? url : `${getServerSideURL()}${url.startsWith('/') ? '' : '/'}${url}`

  return appendCacheBust(absolute, media.updatedAt)
}

function appendCacheBust(url: string, updatedAt: string | null | undefined): string {
  if (!updatedAt) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(updatedAt)}`
}

export default getMediaUrl
