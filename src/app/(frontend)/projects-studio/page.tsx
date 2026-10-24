import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicProjects } from '@/lib/payload/get-public-projects'
import { ProjectsGridSection } from '@/components/sections/ProjectsGrid'
import { ProjectsStudioHero } from '@/components/pages/projects-studio'
import { Container } from '@/components/ui/Container'
import { ProjectsListSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'أستوديو المشاريع والابتكارات' : 'Projects Studio'
  const description = isAr
    ? 'اكتشف مشاريع التخرج الابتكارية والأعمال التطويرية لطلاب ومنتسبي الجامعة.'
    : 'Discover innovative graduation projects and developmental works by university students.'
  return { title, description, openGraph: { title, description } }
}

export default async function ProjectsStudioListPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<ProjectsListSkeleton />}>
      <ProjectsStudioListContent locale={locale} />
    </Suspense>
  )
}

async function ProjectsStudioListContent({ locale }: { locale: Locale }) {
  const projects = await getPublicProjects({ locale, limit: 100 })

  return (
    <div className="min-h-screen bg-background">
      {/* Extracted Hero Banner Section */}
      <ProjectsStudioHero locale={locale} />

      {/* Projects Grid Section */}
      <Container className="py-12 md:py-16">
        <ProjectsGridSection items={projects} disableInnerContainer />
      </Container>
    </div>
  )
}
