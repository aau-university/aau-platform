import { FolderOpen } from 'lucide-react'
import { PageHeroLayout } from '@/components/ui/PageHeroLayout'
import type { Locale } from '@/i18n/locale'

export interface ProjectsStudioHeroProps {
  locale: Locale
}

export function ProjectsStudioHero({ locale }: ProjectsStudioHeroProps) {
  const isAr = locale === 'ar'

  return (
    <PageHeroLayout
      locale={locale}
      breadcrumbItems={[
        { label: isAr ? 'مشاريع التخرج والابتكارات' : 'Graduation Projects & Innovations' },
      ]}
      badgeIcon={FolderOpen}
      badgeText={isAr ? 'حاضنة التميز العلمي' : 'Scientific Excellence Incubator'}
      title={isAr ? 'أستوديو المشاريع' : 'Projects Studio'}
      description={
        isAr
          ? 'نستعرض هنا نتاج وإبداع طلابنا من خلال مشاريع تخرج مميزة وابتكارات تقنية تهدف لحل مشكلات حقيقية.'
          : "Here we showcase our students' creativity through unique graduation projects and technical innovations aimed at solving real-world problems."
      }
    />
  )
}
