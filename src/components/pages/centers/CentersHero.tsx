import { Building2 } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface CentersHeroProps {
  locale: Locale
}

export function CentersHero({ locale }: CentersHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'المراكز والخدمات' : 'Centers & Services' }]}
      badgeIcon={Building2}
      badgeText={isAr ? 'خدمات جامعية متخصصة' : 'Specialized University Services'}
      title={isAr ? 'المراكز والخدمات' : 'Centers & Services'}
      description={
        isAr
          ? 'مراكز ووحدات متخصصة تدعم تجربتك الأكاديمية والإدارية، من اللغة والاستشارات إلى الخدمات الطلابية والبحثية.'
          : 'Specialized centers and units supporting your academic and administrative journey — from language and consulting to student and research services.'
      }
    />
  )
}

export default CentersHero
