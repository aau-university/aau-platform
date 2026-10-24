import { Users } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface FacultyHeroProps {
  locale: Locale
}

export function FacultyHero({ locale }: FacultyHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'الكادر التعليمي' : 'Faculty' }]}
      badgeIcon={Users}
      badgeText={isAr ? 'نخبة من الأساتذة والأكاديميين' : 'Elite Academics & Educators'}
      title={isAr ? 'الكادر التعليمي' : 'Faculty'}
      description={
        isAr
          ? 'نخبة من الأساتذة والدكاترة المتميزين في جامعة الجيل الجديد، يجمعون بين الخبرة الأكاديمية والبحثية لتقديم تعليم متميز.'
          : 'Distinguished faculty members at Al-Jeel Al-Jadeed University, combining academic expertise and research excellence to deliver outstanding education.'
      }
    />
  )
}

export default FacultyHero
