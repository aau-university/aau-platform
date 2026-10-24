import { BookOpen } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface ResearchArticlesHeroProps {
  locale: Locale
}

export function ResearchArticlesHero({ locale }: ResearchArticlesHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[
        { label: isAr ? 'البحث العلمي' : 'Research', href: '/research/journal' },
        { label: isAr ? 'المقالات والأبحاث' : 'Publications & Articles' },
      ]}
      badgeIcon={BookOpen}
      badgeText={isAr ? 'النتاج المعرفي الأكاديمي' : 'Academic Knowledge Output'}
      title={isAr ? 'الأبحاث والمقالات' : 'Research Publications'}
      description={
        isAr
          ? 'نستعرض المقالات البحثية المحكمة والدراسات العلمية المنشورة من قبل أعضاء الهيئة التدريسية في مختلف التخصصات.'
          : 'We showcase peer-reviewed research publications and academic studies published by our faculty members across diverse disciplines.'
      }
    />
  )
}
