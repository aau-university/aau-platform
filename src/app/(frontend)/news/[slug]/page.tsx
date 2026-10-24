import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicNews, getNewsBySlug } from '@/lib/payload/get-public-news'
import { generateMeta } from '@/utilities/generateMeta'
import {
  assertPreviewDocument,
  getDraftPreviewContextFromSearchParams,
  resolvePreviewLocale,
  type DraftPreviewContext,
  type PreviewSearchParams,
} from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { contentReadContext } from '@/lib/payload/content-read-context'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import {
  NewsDetailHero,
  NewsDetailContent,
  NewsDetailSidebar,
} from '@/components/pages/news-detail'
import { NewsDetailSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>
  searchParams: PreviewSearchParams
}

/**
 * Per-doc `<Metadata>` built from the News SEO field group.
 */
export async function generateMetadata({ params, searchParams }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const news = await getNewsBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!news) return asPreviewMetadata({ title: 'News' }, preview.draft)
  assertPreviewDocument(preview, 'news', news.id)

  return asPreviewMetadata(generateMeta({
    doc: news,
    collectionSlug: 'news',
    locale,
  }), preview.draft)
}

export default async function NewsDetailPage({ params, searchParams }: NewsDetailPageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('news', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<NewsDetailSkeleton />}>
      <NewsDetailBody slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function NewsDetailBody({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const news = await getNewsBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!news) {
    notFound()
  }
  assertPreviewDocument(preview, 'news', news.id)
  alignDraftPreviewPath(preview, 'news', `/news/${slug}`, news as unknown as Record<string, unknown>)

  // Related news list
  const related = (await getPublicNews({
    locale,
    limit: 4,
    readContext: contentReadContext(preview.draft, preview.user),
  })).filter(
    (item) => item.slug !== news.slug,
  )

  return (
    <article className="min-h-screen bg-background">
      {/* Detail Hero Header */}
      <NewsDetailHero news={news} locale={locale} />

      <DetailPageShell sidebar={<NewsDetailSidebar related={related} locale={locale} />}>
        <NewsDetailContent news={news} />
      </DetailPageShell>
    </article>
  )
}
