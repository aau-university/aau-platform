import { Handshake } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface PartnersHeroProps {
  locale: Locale
}

export function PartnersHero({ locale }: PartnersHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'شركاؤنا' : 'Our Partners' }]}
      badgeIcon={Handshake}
      badgeText={isAr ? 'شراكات استراتيجية' : 'Strategic Alliances'}
      title={isAr ? 'شركاء النجاح' : 'Success Partners'}
      description={
        isAr
          ? 'نفخر بشراكاتنا مع الهيئات والمؤسسات المحلية والدولية الرائدة لتعزيز التدريب والابتكار والتوظيف لطلابنا.'
          : 'We take pride in our partnerships with leading local and international organizations to enhance training, innovation, and career paths for our students.'
      }
    />
  )
}
