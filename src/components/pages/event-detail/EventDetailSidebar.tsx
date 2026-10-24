import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, MapPin } from 'lucide-react'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { PublicEventItem } from '@/lib/payload/get-public-events'
import type { Locale } from '@/i18n/locale'

export interface EventDetailSidebarProps {
  related: PublicEventItem[]
  locale: Locale
  currentSlug: string
}

export function EventDetailSidebar({ related, locale, currentSlug }: EventDetailSidebarProps) {
  const isAr = locale === 'ar'
  const filtered = related.filter((e) => e.slug !== currentSlug).slice(0, 4)

  if (filtered.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
        <span className="h-5 w-1 rounded-full bg-secondary" />
        {isAr ? 'فعاليات ذات صلة' : 'Related Events'}
      </h2>

      <div className="space-y-4">
        {filtered.map((item) => {
          const formattedDate = item.eventDate ? formatDateTimeSync(item.eventDate, locale) : ''

          return (
            <Link
              key={item.id}
              href={`/events/${item.slug}`}
              className="group flex min-h-11 gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.image && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-secondary">
                  {item.title}
                </h4>
                <div className="mt-1 flex flex-col gap-0.5">
                  {formattedDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 shrink-0 text-secondary" />
                      {formattedDate}
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-secondary" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        href="/events"
        className="mt-6 flex min-h-11 w-full items-center justify-center rounded-full border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isAr ? 'عرض جميع الفعاليات' : 'View All Events'}
      </Link>
    </div>
  )
}
