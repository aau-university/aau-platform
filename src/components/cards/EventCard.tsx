'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, MapPin, Users, Tag, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'
import type { PublicEventItem } from '@/lib/payload/get-public-events'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'

export type EventCardProps = {
  event: PublicEventItem
  locale?: Locale
  className?: string
}

export function EventCard({ event, locale = 'ar', className }: EventCardProps) {
  const { title, slug, description, image, eventDate, location, organizer, category, collegeName } =
    event
  const linkHref = slug ? `/events/${slug}` : '#'
  const formattedDate = eventDate
    ? formatDateTimeSync(eventDate, locale)
    : ''

  return (
    <Link href={linkHref} className="group block h-full" aria-label={title}>
      <article
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/8 bg-card/50 backdrop-blur-sm transition-all duration-500 h-full flex flex-col cursor-pointer',
          'hover:border-secondary/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)] hover:-translate-y-1',
          className,
        )}
      >
        {/* Image Block */}
        <div className="relative aspect-[16/10] w-full overflow-hidden shrink-0 bg-gradient-to-br from-primary via-primary/80 to-secondary/20">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />

          {/* Date badge — top left */}
          {formattedDate && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/90 px-3 py-1.5 text-xs font-semibold text-secondary-foreground backdrop-blur-md shadow-md">
              <CalendarDays className="h-3.5 w-3.5" />
              {formattedDate}
            </div>
          )}

          {/* Category badge — top right */}
          {category && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
              <Tag className="h-3 w-3 text-secondary" />
              {category}
            </div>
          )}

          {/* Arrow icon on hover */}
          <div className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
            <ArrowUpRight className="h-4 w-4 text-secondary-foreground" />
          </div>
        </div>

        {/* Content Block */}
        <div className="flex flex-1 flex-col p-5">
          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-base font-bold leading-snug transition-colors duration-200 group-hover:text-secondary">
            {title}
          </h3>

          {/* Description excerpt */}
          {description && (
            <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {!description && <div className="flex-1" />}

          {/* Meta row */}
          <div className="mt-auto flex flex-col gap-1.5 pt-3 border-t border-border/50">
            {location && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary" />
                <span className="truncate">{location}</span>
              </span>
            )}
            {organizer && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0 text-secondary" />
                <span className="truncate">{organizer}</span>
              </span>
            )}
            {collegeName && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                <span className="truncate">{collegeName}</span>
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

export default EventCard
