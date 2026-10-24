import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getCollegeBySlug } from '@/lib/payload/get-public-colleges'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { contentReadContext } from '@/lib/payload/content-read-context'

import { CollegeDetailSkeleton, CollegeSectionSkeleton } from './skeleton'
import {
  CollegeHero,
  CollegeAbout,
  CollegeStrategicCore,
  CollegePrograms,
  CollegeAdmission,
  CollegeLeadership,
  CollegeNews,
} from '@/components/pages/college-detail'

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
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const college = await getCollegeBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (college) assertPreviewDocument(preview, 'colleges', college.id)

  return asPreviewMetadata(generateMeta({
    doc: college
      ? { meta: college.meta, title: college.name, slug: college.slug }
      : null,
    collectionSlug: 'colleges',
    locale,
  }), preview.draft)
}

// ============================================================================
// Main Page Assembly
// ============================================================================
async function CollegeDetail({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: Awaited<ReturnType<typeof getDraftPreviewContextFromSearchParams>>
}) {
  const college = await getCollegeBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!college) notFound()
  assertPreviewDocument(preview, 'colleges', college.id)
  alignDraftPreviewPath(preview, 'colleges', `/colleges/${slug}`, college as unknown as Record<string, unknown>)
  const readContext = contentReadContext(preview.draft, preview.user)

  return (
    <div className="flex flex-col w-full">
      <CollegeHero college={college} locale={locale} />
      <CollegeAbout college={college} locale={locale} />
      <CollegeStrategicCore college={college} locale={locale} />
      
      <Suspense fallback={<CollegeSectionSkeleton />}>
        <CollegePrograms
          collegeSlug={college.slug}
          locale={locale}
          readContext={readContext}
        />
      </Suspense>
      
      <CollegeAdmission college={college} locale={locale} />

      <Suspense fallback={<CollegeSectionSkeleton />}>
        <CollegeLeadership
          collegeSlug={college.slug}
          locale={locale}
          readContext={readContext}
        />
      </Suspense>

      <Suspense fallback={<CollegeSectionSkeleton />}>
        <CollegeNews
          collegeSlug={college.slug}
          locale={locale}
          readContext={readContext}
        />
      </Suspense>
    </div>
  )
}

export default async function CollegeDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('colleges', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<CollegeDetailSkeleton />}>
        <CollegeDetail slug={slug} locale={locale} preview={preview} />
      </Suspense>
    </div>
  )
}
