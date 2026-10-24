import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getCampusLifeBySlug } from '@/lib/payload/get-public-campus-life'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import {
  CampusLifeHero,
  CampusLifeContent,
  CampusLifeSidebar,
} from '@/components/pages/campus-life-detail'
import { CampusLifeDetailSkeleton } from './skeleton'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { buildCollectionPath } from '@/utilities/collectionRoutes'

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
  const item = await getCampusLifeBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!item) return asPreviewMetadata({ title: 'Campus Life' }, preview.draft)
  assertPreviewDocument(preview, 'campus-life', item.id)
  return asPreviewMetadata({
    title: item.title,
    description: item.summary || undefined,
    openGraph: { title: item.title, description: item.summary || undefined },
  }, preview.draft)
}

export default async function CampusLifeDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('campus-life', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<CampusLifeDetailSkeleton />}>
      <CampusLifeDetailContent slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function CampusLifeDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const item = await getCampusLifeBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!item) {
    notFound()
  }
  assertPreviewDocument(preview, 'campus-life', item.id)
  alignDraftPreviewPath(preview, 'campus-life', `/campus-life/${slug}`, item as unknown as Record<string, unknown>)

  return (
    <div className="min-h-screen bg-background">
      <CampusLifeHero item={item} locale={locale} />
      <CampusLifeContent
        item={item}
        locale={locale}
        sidebar={<CampusLifeSidebar item={item} locale={locale} />}
      />
    </div>
  )
}
