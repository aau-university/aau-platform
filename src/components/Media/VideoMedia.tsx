import type React from 'react'

import type { Media } from '@/payload-types'

/**
 * Props for {@link VideoMedia}.
 *
 * `resource` is the populated Media document. All additional props
 * (`className`, `style`, `controls`, `autoPlay`, `muted`, `loop`,
 * `playsInline`, etc.) are forwarded to the underlying `<video>`
 * element.
 */
export interface VideoMediaProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'resource'> {
  resource: Media | null | undefined
}

/**
 * `VideoMedia` — render a video Media doc via a native `<video>`.
 *
 * Uses a plain `<video>` tag (not a third-party player) for zero-JS
 * playback. The browser's native controls are enabled by default;
 * callers can override (e.g. `autoPlay muted loop playsInline` for a
 * background hero video — pass `{...{ controls: false }}`).
 *
 * `src` is `resource.url`. The `poster` attribute is set to
 * `resource.thumbnailURL` when present — Payload's `upload: true`
 * generates a thumbnail for image MIME types, but for video MIME
 * types `thumbnailURL` is null unless a custom video-processing hook
 * is installed. When `thumbnailURL` is missing, no `poster` is set
 * (the browser shows the first frame or a black box until metadata
 * loads).
 *
 * The Media collection's `upload: true` (no `imageSizes` block) means
 * there are no transcoded video sizes — the original file is served
 * as-is. Callers should ensure videos are web-optimized (H.264 +
 * AAC, MP4 container) before upload.
 */
export const VideoMedia: React.FC<VideoMediaProps> = ({
  resource,
  ...props
}) => {
  if (!resource || !resource.url) return null

  const src = resource.url
  const poster = resource.thumbnailURL ?? undefined

  return (
    <video
      src={src}
      controls
      {...(poster ? { poster } : {})}
      {...props}
    />
  )
}

export default VideoMedia
