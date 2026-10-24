import { Container } from '@/components/ui/Container'
import { resolveMediaUrl } from '@/lib/payload/resolve-media'
import type { VideoLayoutBlock } from '@/blocks/types'

export interface VideoSectionProps {
  content: VideoLayoutBlock
  disableInnerContainer?: boolean
}

export function VideoSection({ content, disableInnerContainer }: VideoSectionProps) {
  const { overlayTitle, overlayDescription, videoFile, posterImage } = content
  const videoUrl = resolveMediaUrl(videoFile)
  const posterUrl = resolveMediaUrl(posterImage)

  if (!videoUrl) return null

  const inner = (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <video
        src={videoUrl}
        poster={posterUrl || undefined}
        className="h-full w-full object-cover"
        controls
        playsInline
      />
      {(overlayTitle || overlayDescription) && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent flex flex-col justify-end p-8">
          {overlayTitle && (
            <h3 className="text-2xl font-bold text-white mb-2">{overlayTitle}</h3>
          )}
          {overlayDescription && (
            <p className="text-white/90 max-w-2xl">{overlayDescription}</p>
          )}
        </div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-950">
      <Container>{inner}</Container>
    </section>
  )
}
