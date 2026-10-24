import { Gift } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface OffersHeroProps {
  locale: Locale
}

export function OffersHero({ locale }: OffersHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'العروض والخصومات' : 'Offers & Discounts' }]}
      badgeIcon={Gift}
      badgeText={isAr ? 'فرص حصرية للطلاب' : 'Exclusive Student Opportunities'}
      title={isAr ? 'العروض والخصومات' : 'Offers & Discounts'}
      description={
        isAr
          ? 'استفد من الحسومات الحصرية والفرص الخاصة الممنوحة لمنتسبي وطلاب جامعة الجيل الجديد بالتعاون مع شركائنا.'
          : 'Take advantage of exclusive discounts and special opportunities provided to Al-Jeel Al-Jadeed University students in collaboration with our partners.'
      }
    />
  )
}
