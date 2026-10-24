import type { Metadata } from 'next'

import { getServerSideURL } from './getURL'

const DEFAULT_OG_IMAGE = '/opengraph-image.png'

/**
 * Build the default OpenGraph metadata using the CMS-provided `siteName`
 * and `description` (from SiteSettings).
 *
 * Per-page OG values from `generateMeta` are merged on top of these via
 * {@link mergeOpenGraph}.
 */
export function buildDefaultOpenGraph(opts: {
  siteName: string
  description: string
}): Metadata['openGraph'] {
  return {
    type: 'website',
    siteName: opts.siteName,
    title: opts.siteName,
    description: opts.description,
    images: [
      {
        url: `${getServerSideURL()}${DEFAULT_OG_IMAGE}`,
      },
    ],
  }
}

/**
 * Merge per-page OpenGraph metadata on top of a provided default.
 *
 * `images` is replaced wholesale when supplied (matches Next.js Metadata
 * semantics — a per-page image fully overrides the default).
 *
 * Usage: callers that have access to SiteSettings should build the default
 * via {@link buildDefaultOpenGraph} and pass it here. Callers without
 * SiteSettings access can omit `base` and the per-page `og` alone is used.
 */
export const mergeOpenGraph = (
  og?: Metadata['openGraph'],
  base?: Metadata['openGraph'],
): Metadata['openGraph'] => {
  const merged: Metadata['openGraph'] = {
    ...(base ?? {}),
    ...og,
  }

  merged.images =
    og?.images && Array.isArray(og.images) && og.images.length > 0
      ? og.images
      : base?.images ?? [
          {
            url: `${getServerSideURL()}${DEFAULT_OG_IMAGE}`,
          },
        ]

  return merged
}

export default mergeOpenGraph
