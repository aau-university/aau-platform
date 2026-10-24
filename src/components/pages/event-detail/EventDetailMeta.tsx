import { Calendar, MapPin, Users, Building2 } from 'lucide-react'
import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'
import type { Locale } from '@/i18n/locale'
import type { PublicEventDetail } from '@/lib/payload/get-public-events'

export interface EventDetailMetaProps {
  event: PublicEventDetail
  locale: Locale
}

const metaCardClass =
  'flex items-start gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm'

export function EventDetailMeta({ event, locale }: EventDetailMetaProps) {
  const isAr = locale === 'ar'
  const formattedDate = event.eventDate ? formatDateTimeSync(event.eventDate, locale) : ''

  const items = [
    {
      icon: Calendar,
      label: isAr ? 'التاريخ' : 'Date',
      value: formattedDate || '—',
      show: true,
    },
    {
      icon: MapPin,
      label: isAr ? 'المكان' : 'Location',
      value: event.location || '—',
      show: true,
    },
    {
      icon: Users,
      label: isAr ? 'المنظم' : 'Organizer',
      value: event.organizer || '—',
      show: !!event.organizer,
    },
    {
      icon: Building2,
      label: isAr ? 'الكلية' : 'College',
      value: event.collegeName || '—',
      show: !!event.collegeName,
    },
  ].filter((i) => i.show)

  if (items.length === 0) return null

  return (
    <div
      className={`grid gap-4 ${
        items.length === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : items.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}
    >
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className={metaCardClass}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15 border border-secondary/20">
            <Icon className="h-5 w-5 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">{label}</p>
            <p className="break-words text-sm font-semibold">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
