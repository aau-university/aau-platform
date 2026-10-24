import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getCenterBySlug, getPublicCenters } from '@/lib/payload/get-public-centers'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { CenterHero, CenterContent, CenterSidebar } from '@/components/pages/center-detail'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { CenterDetailSkeleton } from './skeleton'

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
  const item = await getCenterBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!item) return asPreviewMetadata({ title: 'Centers' }, preview.draft)
  assertPreviewDocument(preview, 'centers', item.id)
  return asPreviewMetadata({
    title: item.title,
    description: item.description || undefined,
    openGraph: {
      title: item.title,
      description: item.description || undefined,
    },
  }, preview.draft)
}

export default async function CenterDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('centers', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<CenterDetailSkeleton />}>
      <CenterDetailContent slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function CenterDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const [center, related] = await Promise.all([
    getCenterBySlug(slug, {
      locale,
      draft: preview.draft,
      documentId: preview.draft ? preview.documentId : undefined,
      user: preview.user ?? undefined,
    }),
    getPublicCenters({ locale, limit: 10 }),
  ])

  if (!center) {
    notFound()
  }
  assertPreviewDocument(preview, 'centers', center.id)
  alignDraftPreviewPath(preview, 'centers', `/centers/${slug}`, center as unknown as Record<string, unknown>)

  const relatedCenters = related.filter((c) => c.id !== center.id).slice(0, 4)

  const contactInfo = {
    email: center.email,
    phone: center.phone,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner Component */}
      <CenterHero center={center} locale={locale} />

      {/* Main Content Component with integrated Sidebar */}
      <CenterContent
        center={center}
        locale={locale}
        sidebar={
          <CenterSidebar
            relatedCenters={relatedCenters}
            locale={locale}
            contactInfo={contactInfo}
          />
        }
      />
    </div>
  )
}
