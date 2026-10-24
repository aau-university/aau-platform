'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Building2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PublicCenterItem } from '@/lib/payload/get-public-centers'

export type CenterCardProps = {
  center: PublicCenterItem
  href?: string
  className?: string
  isAr?: boolean
}

export function CenterCard({
  center,
  href,
  className,
  isAr = false,
}: CenterCardProps) {
  const { title, slug, description, image, kind } = center
  const linkHref = href ?? (slug ? `/centers/${slug}` : '#')

  const getKindLabel = () => {
    if (!kind) return null
    switch (kind) {
      case 'center':
        return isAr ? 'مركز متخصص' : 'Specialized Center'
      case 'service':
        return isAr ? 'مركز خدمي' : 'Service Center'
      case 'universityCenter':
        return isAr ? 'مركز جامعي' : 'University Center'
      default:
        return null
    }
  }

  const kindLabel = getKindLabel()

  const content = (
    <article
      className={cn(
        'group relative bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden border border-border/50 hover:border-secondary/35 shadow-sm hover:shadow-gold transition-all duration-500 h-full flex flex-col',
        className
      )}
    >
      {/* Top Banner (Image or Gradient Mesh) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden shrink-0 bg-primary/10">
        {image ? (
          <>
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#111] to-primary flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-black/20 to-transparent" />
            <div className="relative z-10 w-16 h-16 bg-card/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border/20 text-secondary group-hover:rotate-[360deg] group-hover:scale-110 transition-all duration-700">
              <Building2 className="w-8 h-8 text-secondary" />
            </div>
          </div>
        )}

        {/* Kind Badge */}
        {kindLabel && (
          <Badge className="absolute top-4 left-4 rtl:left-auto rtl:right-4 z-10 bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold shadow-md rounded-full px-3 py-1 text-xs">
            {kindLabel}
          </Badge>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-grow relative">
        <h3 className="text-xl font-bold line-clamp-2 mb-3 text-foreground group-hover:text-secondary transition-colors duration-300">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-3 flex-grow leading-relaxed mb-4">
            {description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center text-sm font-bold text-secondary group-hover:text-secondary-foreground/90 transition-colors duration-300 gap-1 rtl:flex-row-reverse justify-end">
          <span>{isAr ? 'اقرأ المزيد' : 'Read More'}</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
            {isAr ? '←' : '→'}
          </span>
        </div>
      </div>
    </article>
  )

  if (linkHref === '#') return content

  return (
    <Link href={linkHref} className="block h-full cursor-pointer" aria-label={title}>
      {content}
    </Link>
  )
}

export default CenterCard

