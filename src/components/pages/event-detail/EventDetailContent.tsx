import Image from 'next/image'
import { RichText } from '@/components/RichText'
import type { PublicEventDetail } from '@/lib/payload/get-public-events'
import type { Locale } from '@/i18n/locale'

export interface EventDetailContentProps {
  event: PublicEventDetail
  locale: Locale
}

export function EventDetailContent({ event, locale }: EventDetailContentProps) {
  const isAr = locale === 'ar'

  return (
    <div>
      {/* Featured image */}
      {event.image && (
        <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-2xl shadow-elegant md:aspect-video">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 66vw, 100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
        </div>
      )}

      {/* Rich text body */}
      {event.descriptionRaw ? (
        <div className="prose prose-lg max-w-[72ch] text-foreground/90 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-secondary prose-a:underline-offset-4">
          <RichText content={event.descriptionRaw} />
        </div>
      ) : event.description ? (
        <p className="max-w-[72ch] text-lg leading-relaxed text-foreground/90">
          {event.description}
        </p>
      ) : (
        <p className="text-muted-foreground italic">
          {isAr
            ? 'لا يوجد تفاصيل إضافية لهذه الفعالية.'
            : 'No additional details available for this event.'}
        </p>
      )}
    </div>
  )
}
