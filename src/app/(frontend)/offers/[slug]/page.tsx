import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getOfferBySlug } from '@/lib/payload/get-public-offers'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { OfferHero, OfferContent, OfferSidebar } from '@/components/pages/offer-detail'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { OfferDetailSkeleton } from './skeleton'

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
  const item = await getOfferBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!item) return asPreviewMetadata({ title: 'Offers' }, preview.draft)
  assertPreviewDocument(preview, 'offers', item.id)
  return asPreviewMetadata({
    title: item.title,
    description: item.description || undefined,
    openGraph: {
      title: item.title,
      description: item.description || undefined,
    },
  }, preview.draft)
}

export default async function OfferDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('offers', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<OfferDetailSkeleton />}>
      <OfferDetailContent slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function OfferDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const offer = await getOfferBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!offer) {
    notFound()
  }
  assertPreviewDocument(preview, 'offers', offer.id)
  alignDraftPreviewPath(preview, 'offers', `/offers/${slug}`, offer as unknown as Record<string, unknown>)

  return (
    <div className="min-h-screen bg-background pt-32 pb-16">
      {/* Top Breadcrumbs & Heading Section */}
      <OfferHero offer={offer} locale={locale} />

      <DetailPageShell sidebar={<OfferSidebar offer={offer} locale={locale} />}>
        <OfferContent offer={offer} locale={locale} />
      </DetailPageShell>
    </div>
  )
}
