import type React from 'react'

import type { Media as MediaType } from '@/payload-types'

import { ImageMedia } from './ImageMedia'
import { VideoMedia } from './VideoMedia'

/**
 * Acceptable shapes for the `resource` prop. Includes `number` to
 * match Payload's relationship field shape (`media?: (number | null)
 * | Media`) — when an unpopulated relationship ID is passed in, the
 * dispatcher renders `null` (the caller should fetch the relationship
 * first via Payload Local API `depth`).
 */
export type MediaResource = MediaType | number | null | undefined

/**
 * Props for the {@link Media} dispatcher.
 *
 * `resource` is the populated Media document (or a partial thereof —
 * the dispatcher only needs `mimeType` to route, and `url` /
 * `filename` / `width` / `height` / `alt` for the inner renderers).
 * A relationship ID (number) is accepted but renders `null` —
 * callers must populate the relationship before passing it in
 * (Payload Local API `depth` controls this). This keeps `Media` a
 * synchronous client-safe component.
 *
 * The index signature `[key: string]: any` lets callers forward
 * arbitrary props (`className`, `fill`, `priority`, `sizes`, etc.)
 * to the inner `ImageMedia` / `VideoMedia` without forcing a fixed
 * prop union on the dispatcher. `any` is intentional here — the
 * inner renderers (`next/image` `ImageProps`, native `<video>`
 * attributes) carry their own strict prop validation, and a strict
 * union on the dispatcher would either (a) lose the union's
 * specificity or (b) require a per-mode conditional type that
 * destroys inference at the call site.
 */
export interface MediaProps {
  resource: MediaResource
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * `Media` — the media dispatcher.
 *
 * Routes a populated Media document to {@link ImageMedia} (for
 * `image/*` mime types) or {@link VideoMedia} (for `video/*` mime
 * types) based on the `mimeType` field. Falls back to a plain `<a>`
 * link for unknown mime types (e.g. PDF, ZIP) — the file's URL is
 * exposed as the link target, and `filename` as the link text.
 *
 * Returns `null` when `resource` is nullish — this lets callers
 * write `<Media resource={doc.hero.media} />` without a defensive
 * guard around an absent media field.
 *
 * The dispatcher itself is a Server Component (no `'use client'`)
 * — but the inner `ImageMedia` uses `next/image`, which is a
 * client component under the hood. The split keeps the dispatcher
 * lightweight (no client JS for the routing logic) and lets the
 * image / video renderers carry their own client-side concerns
 * (e.g. `next/image`'s lazy-loading IntersectionObserver).
 */
export const Media: React.FC<MediaProps> = ({ resource, ...props }) => {
  if (!resource || typeof resource === 'number') return null

  const mimeType = resource.mimeType ?? ''

  if (mimeType.startsWith('image/')) {
    return <ImageMedia resource={resource} {...props} />
  }

  if (mimeType.startsWith('video/')) {
    return <VideoMedia resource={resource} {...props} />
  }

  // Fallback: link to the file directly (PDFs, ZIPs, docs, etc.).
  const href = resource.url ?? ''
  const label = resource.filename ?? href
  if (!href) return null

  return (
    <a href={href} download>
      {label}
    </a>
  )
}

export default Media
