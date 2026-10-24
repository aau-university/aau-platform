import type React from 'react'
import Image, { type ImageProps } from 'next/image'

import { resolveMediaUrl } from '@/lib/payload/resolve-media'

import type { Media } from '@/payload-types'

/**
 * Props for {@link ImageMedia}. Mirrors `next/image`'s `ImageProps` so
 * callers can forward any standard `next/image` prop (`fill`,
 * `priority`, `sizes`, `quality`, `className`, `style`, etc.).
 *
 * `resource` is the populated Media document. `alt` overrides
 * `resource.alt` when callers want to inject context-specific alt text
 * (e.g. decorative images should pass `alt=""`).
 */
export interface ImageMediaProps
  extends Omit<ImageProps, 'src' | 'alt' | 'width' | 'height' | 'resource'> {
  resource: Media | null | undefined
  alt?: string
}

/**
 * `ImageMedia` — render an image Media doc via `next/image`.
 *
 * Two modes:
 *
 *   - **`fill` mode** (caller passes `fill`): the `<Image>` is sized
 *     by its parent (which MUST be `position: relative` or `absolute`).
 *     `width` / `height` are NOT forwarded — `next/image` rejects them
 *     when `fill` is set.
 *
 *   - **fixed-size mode** (default): `width` / `height` come from the
 *     Media doc's `width` / `height` fields, falling back to a 1200×630
 *     LCP-friendly default when the doc is missing dimensions
 *     (happens when the upload hasn't been processed yet or the media
 *     is a relationship at depth 0).
 *
 * `src` is `resource.url`, normalized through `resolveMediaUrl`.
 *
 * Payload is configured with a `serverURL`, so for LOCAL storage
 * (`S3_ENABLED=false`, which is how the VPS runs) `url` comes back as a
 * SAME-SITE ABSOLUTE URL — `https://aau.edu.ye/api/media/file/<name>` —
 * not as the relative path `images.localPatterns` whitelists. `next/image`
 * treats any absolute URL as remote and requires a matching
 * `images.remotePatterns` entry, and the canonical origin deliberately has
 * none: it is this site, not a remote CDN. The image then fails to render.
 *
 * `resolveMediaUrl` strips a leading `NEXT_PUBLIC_SERVER_URL` so a same-site
 * absolute URL becomes the local path `localPatterns` already covers. It is a
 * no-op for a URL that is already relative, and it leaves a genuinely remote
 * URL alone — an S3 URL lives on a different origin, so it does not match the
 * prefix and stays absolute for `s3RemotePatterns()` to authorize.
 *
 * The public-page loaders (`get-public-*.ts`) already apply exactly this
 * normalization to the URL strings they return. Applying it here puts every
 * `<Media>` consumer — the About page's team cards among them, which pass the
 * populated Media document straight through rather than a pre-resolved string
 * — on the same rule, instead of leaving it to each call site to remember.
 *
 * `alt` falls back to `resource.alt`, then to an empty string
 * (decorative). `next/image` requires a non-undefined `alt`.
 */
export const ImageMedia: React.FC<ImageMediaProps> = ({
  resource,
  alt,
  ...props
}) => {
  if (!resource || !resource.url) return null

  const src = resolveMediaUrl(resource.url) ?? resource.url
  const finalAlt = alt ?? resource.alt ?? ''
  const width = resource.width ?? 1200
  const height = resource.height ?? 630

  if (props.fill) {
    return <Image src={src} alt={finalAlt} {...props} />
  }

  return <Image src={src} alt={finalAlt} width={width} height={height} {...props} />
}

export default ImageMedia
