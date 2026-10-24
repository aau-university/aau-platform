import { PenLine } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface BlogHeroProps {
  locale: Locale
}

export function BlogHero({ locale }: BlogHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[{ label: isAr ? 'المدونة' : 'Blog' }]}
      badgeIcon={PenLine}
      badgeText={isAr ? 'مقالات ومحتوى أكاديمي' : 'Articles & Academic Content'}
      title={isAr ? 'المدونة الأكاديمية' : 'Academic Blog'}
      description={
        isAr
          ? 'مقالات وأبحاث ونصائح أكاديمية تخدم مسيرتك التعليمية وتواكب التطورات في عالم المعرفة.'
          : 'Articles, research insights, and academic tips that support your educational journey and keep you updated with the world of knowledge.'
      }
    />
  )
}
