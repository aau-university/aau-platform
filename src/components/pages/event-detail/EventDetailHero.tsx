import { Calendar, MapPin, Users, Tag, Building2 } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Breadcrumb } from '@/components/Breadcrumb'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'
import type { PublicEventDetail } from '@/lib/payload/get-public-events'

export interface EventDetailHeroProps {
  event: PublicEventDetail
  locale: Locale
}

export function EventDetailHero({ event, locale }: EventDetailHeroProps) {
  const isAr = locale === 'ar'
  const formattedDate = event.eventDate ? formatDateTimeSync(event.eventDate, locale) : ''

  const breadcrumbItems = [
    { label: isAr ? 'الفعاليات' : 'Events', href: '/events' },
    { label: event.title },
  ]

  return (
    <div className="relative overflow-hidden border-b border-border/10 bg-primary pb-14 pt-32 text-primary-foreground shadow-lg md:pb-16">
      {/* Backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-primary/95 to-secondary/20" />
      <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />
      <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-foreground/5 blur-[120px] pointer-events-none" />

      <Container className="relative z-10">
        <Breadcrumb items={breadcrumbItems} locale={locale} />

        <div className="mt-8 max-w-4xl">
          {/* Category + college badges */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {event.category && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/15 px-3 py-1 text-xs font-semibold text-secondary">
                <Tag className="h-3 w-3" />
                {event.category}
              </span>
            )}
            {event.collegeName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/15 bg-card/10 px-3 py-1 text-xs font-medium text-primary-foreground/80">
                <Building2 className="h-3 w-3" />
                {event.collegeName}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight drop-shadow-sm">
            {event.title}
          </h1>

          {/* Meta pills */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-primary-foreground/75">
            {formattedDate && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary" />
                {formattedDate}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" />
                {event.location}
              </span>
            )}
            {event.organizer && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" />
                {event.organizer}
              </span>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
