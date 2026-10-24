import { Newspaper } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface NewsHeroProps {
  locale: Locale
}

export function NewsHero({ locale }: NewsHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'الأخبار' : 'News' }]}
      badgeIcon={Newspaper}
      badgeText={isAr ? 'آخر المستجدات والأحداث' : 'Latest News & Events'}
      title={isAr ? 'الأخبار والمستجدات' : 'News & Announcements'}
      description={
        isAr
          ? 'تابع آخر أخبار وإعلانات جامعة الجيل الجديد، وكن على اطلاع دائم بكل الأحداث والقرارات الأكاديمية.'
          : 'Follow the latest news and announcements from Al-Jeel Al-Jadeed University, and stay updated with all academic events.'
      }
    />
  )
}
