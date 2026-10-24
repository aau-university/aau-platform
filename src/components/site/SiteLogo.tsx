import Image from 'next/image'
import { GraduationCap } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { PublicSiteLogo } from '@/lib/payload/get-public-site-settings'

interface SiteLogoProps {
  logo?: PublicSiteLogo
  siteName: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
  width: number
  height: number
}

export function SiteLogo({
  logo,
  siteName,
  className,
  imageClassName,
  fallbackClassName,
  width,
  height,
}: SiteLogoProps) {
  if (logo?.url) {
    const isSvg = logo.mimeType?.toLowerCase().startsWith('image/svg+xml') ?? false
    const isRemote = /^(?:https?:)?\/\//i.test(logo.url)
    const unoptimized = isSvg || isRemote || !logo.mimeType

    return (
      <span className={cn('relative block shrink-0 overflow-hidden', className)}>
        <Image
          src={logo.url}
          alt={logo.alt || siteName}
          width={logo.width || width}
          height={logo.height || height}
          sizes={`${width}px`}
          unoptimized={unoptimized}
          className={cn('size-full object-contain', imageClassName)}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center bg-secondary text-primary shadow-gold',
        className,
        fallbackClassName,
      )}
      aria-hidden="true"
      data-testid="site-logo-fallback"
    >
      <GraduationCap className="size-3/5" />
    </span>
  )
}
