import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getCollegeBySlug, getCollegeFaculty, getCollegeDepartmentsWithPrograms } from '@/lib/payload/get-public-colleges'
import {
  assertPreviewDocument,
  getDraftPreviewContextFromSearchParams,
  resolvePreviewLocale,
  type PreviewSearchParams,
  type DraftPreviewContext,
} from '@/lib/payload/preview-context'
import { generateMeta } from '@/utilities/generateMeta'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { FacultyDirectory } from '@/components/pages/college-detail'
import { CollegeDetailSkeleton } from '../skeleton'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: PreviewSearchParams
}

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const college = await getCollegeBySlug(slug, {
    locale,
    draft: preview.draft,
    user: preview.user ?? undefined,
  })
  if (college) assertPreviewDocument(preview, 'colleges', college.id)

  const title = locale === 'ar' ? `دليل أعضاء هيئة التدريس - ${college?.name || ''}` : `Faculty Directory - ${college?.name || ''}`

  // `faculty` is a registered dependent route of the college document. The
  // metadata resolver validates the segment against the central route registry.
  return asPreviewMetadata(
    generateMeta({
      doc: college
        ? { title, slug: college.slug, dependentSegment: 'faculty' }
        : null,
      collectionSlug: 'colleges',
    }),
    preview.draft,
  )
}

async function FacultyDirectoryPageContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const loaderOptions = {
    locale,
    draft: preview.draft,
    user: preview.user ?? undefined,
  }
  const college = await getCollegeBySlug(slug, loaderOptions)

  if (!college) notFound()
  assertPreviewDocument(preview, 'colleges', college.id)

  const [faculty, departments] = await Promise.all([
    getCollegeFaculty(slug, loaderOptions),
    getCollegeDepartmentsWithPrograms(slug, loaderOptions),
  ])

  return (
    <FacultyDirectory collegeName={college.name} faculty={faculty} departments={departments} />
  )
}

export default async function CollegeFacultyPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<CollegeDetailSkeleton />}>
        <FacultyDirectoryPageContent slug={slug} locale={locale} preview={preview} />
      </Suspense>
    </div>
  )
}
