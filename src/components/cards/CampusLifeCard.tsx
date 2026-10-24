'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, CalendarDays } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PublicCampusLifeItem } from '@/lib/payload/get-public-campus-life'

export type CampusLifeCardProps = {
  item: PublicCampusLifeItem
  href?: string
  className?: string
  isAr?: boolean
}

export function CampusLifeCard({
  item,
  href,
  className,
  isAr = false,
}: CampusLifeCardProps) {
  const { title, slug, summary, image, kind } = item
  const linkHref = href ?? (slug ? `/campus-life/${slug}` : '#')

  const getKindLabel = () => {
    if (!kind) return null
    switch (kind) {
      case 'life':
        return isAr ? 'حياة جامعية' : 'Campus Life'
      case 'activity':
        return isAr ? 'أنشطة طلابية' : 'Student Activities'
      default:
        return null
    }
  }

  const kindLabel = getKindLabel()

  const content = (
    <article
      className={cn(
        'group relative bg-card shadow-sm hover:shadow-gold rounded-2xl overflow-hidden border border-border/80 hover:border-secondary/35 transition-all duration-500 h-full flex flex-col',
        className
      )}
    >
      {/* Banner Area */}
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
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-black/25 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#111] to-primary flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-black/25 to-transparent" />
            <div className="relative z-10 w-14 h-14 bg-card/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-border/20 text-secondary group-hover:rotate-[360deg] group-hover:scale-110 transition-all duration-700">
              <Sparkles className="w-6 h-6 text-secondary" />
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

      {/* Content Area */}
      <div className="p-6 flex flex-col flex-grow relative">
        {/* Floating Sparkle icon on the card border (Premium accent) */}
        <div className="absolute -top-6 right-6 w-11 h-11 bg-white dark:bg-[#151515] rounded-xl flex items-center justify-center border border-border/80 transition-transform duration-500 group-hover:rotate-[360deg] group-hover:scale-110 shadow-md">
          <Sparkles className="w-5 h-5 text-secondary shrink-0" />
        </div>

        <h3 className="text-lg font-bold line-clamp-2 mb-3 text-foreground group-hover:text-secondary transition-colors duration-300 pt-2 leading-snug">
          {title}
        </h3>

        {summary && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 flex-grow leading-relaxed mb-4">
            {summary}
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
    <Link href={linkHref} className="block h-full cursor-pointer animate-in fade-in duration-500" aria-label={title}>
      {content}
    </Link>
  )
}

export default CampusLifeCard

