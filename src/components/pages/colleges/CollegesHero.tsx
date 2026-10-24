import { GraduationCap } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'
import type { Locale } from '@/i18n/locale'

export function CollegesHero({ locale }: { locale: Locale }) {
  const breadcrumbLabel = locale === 'ar' ? 'كلياتنا' : 'Our Colleges'
  const heroTitle = locale === 'ar' ? 'كلياتنا' : 'Our Colleges'
  const heroDescription =
    locale === 'ar'
      ? 'نقدم مجموعة متنوعة من البرامج الأكاديمية المتميزة في مختلف التخصصات، مع التركيز على الجودة والتميز في التعليم والبحث العلمي'
      : 'We offer a diverse range of distinguished academic programs in various specializations, with a focus on quality and excellence in education and scientific research'

  return (
    <>
      <Breadcrumb
        locale={locale}
        items={[{ label: breadcrumbLabel }]}
      />

      <div className="mb-10 text-center mt-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <GraduationCap className="h-4 w-4" />
          {locale === 'ar' ? 'التميز الأكاديمي' : 'Academic Excellence'}
        </div>
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{heroTitle}</h1>
        <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-primary to-secondary" />
        <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {heroDescription}
        </p>
      </div>
    </>
  )
}
