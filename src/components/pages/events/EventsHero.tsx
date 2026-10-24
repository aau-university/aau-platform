import { CalendarRange } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface EventsHeroProps {
  locale: Locale
}

export function EventsHero({ locale }: EventsHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'الفعاليات' : 'Events' }]}
      badgeIcon={CalendarRange}
      badgeText={isAr ? 'جدول الفعاليات الجامعية' : 'University Events Calendar'}
      title={isAr ? 'الفعاليات والأنشطة' : 'Events & Activities'}
      description={
        isAr
          ? 'تابع أحدث الفعاليات والأنشطة الجامعية وشارك في تجارب تثري مسيرتك الأكاديمية والاجتماعية.'
          : 'Stay up to date with the latest university events and activities. Participate in experiences that enrich your academic and social journey.'
      }
    />
  )
}
