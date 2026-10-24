'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/payload/resolve-media'
import type { PublicPartnerItem } from '@/lib/payload/get-public-partners'
import type { Partner } from '@/payload-types'

export type PartnerCardItem = {
  id?: PublicPartnerItem['id'] | Partner['id'] | null
  name?: PublicPartnerItem['name'] | Partner['name'] | null
  logo?: PublicPartnerItem['logo'] | Partner['logo']
  description?: PublicPartnerItem['description'] | Partner['description'] | null
  website?: PublicPartnerItem['website'] | Partner['website'] | null
}

export type PartnerCardProps = {
  partner: PartnerCardItem
  className?: string
}

export function PartnerCard({ partner, className }: PartnerCardProps) {
  const { name, logo, website, description } = partner
  const logoUrl = resolveMediaUrl(logo)

  const content = (
    <div className="relative z-10 flex w-full min-w-0 flex-col items-center justify-center gap-3">
      {logoUrl && name ? (
        <div className="relative w-full h-16 transition-transform duration-500 group-hover:scale-105">
          <Image
            src={logoUrl}
            alt={name}
            fill
            sizes="120px"
            className="object-contain filter grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
          />
        </div>
      ) : (
        <span className="w-full text-center text-sm font-bold text-foreground transition-colors group-hover:text-primary">
          {name}
        </span>
      )}

      {description && (
        <span className="line-clamp-2 w-full text-center text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      )}
    </div>
  )

  const containerClass = cn(
    'group relative flex min-h-36 w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-card/75 px-4 py-5 shadow-elegant backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-secondary/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none sm:px-6',
    className,
  )

  if (website) {
    return (
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className={containerClass}
        aria-label={name ?? 'Partner Website'}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {content}
      </a>
    )
  }

  return (
    <div className={containerClass}>
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {content}
    </div>
  )
}

export default PartnerCard
