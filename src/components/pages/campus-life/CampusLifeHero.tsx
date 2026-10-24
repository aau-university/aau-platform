import { Sparkles } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface CampusLifeHeroProps {
  locale: Locale
}

export function CampusLifeHero({ locale }: CampusLifeHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'الحياة الجامعية' : 'Campus Life' }]}
      badgeIcon={Sparkles}
      badgeText={isAr ? 'تجربة طلابية متكاملة' : 'A Complete Student Experience'}
      title={isAr ? 'الحياة الجامعية' : 'Campus Life'}
      description={
        isAr
          ? 'استكشف الحياة الجامعية النابضة بالحيوية والمرافق الحديثة في جامعة الجيل الجديد، وأنشطة طلابية متنوعة تثري مسيرتك.'
          : 'Explore vibrant campus life and modern facilities at Al-Jeel Al-Jadeed University, with diverse student activities enriching your journey.'
      }
    />
  )
}

export default CampusLifeHero
