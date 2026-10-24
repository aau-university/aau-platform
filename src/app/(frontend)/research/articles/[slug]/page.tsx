import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getResearchArticleBySlug } from '@/lib/payload/get-public-research'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { ResearchHero, ResearchContent, ResearchSidebar } from '@/components/pages/research-detail'
import { ArticleDetailSkeleton } from './skeleton'
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
  const item = await getResearchArticleBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!item) return asPreviewMetadata({ title: 'Scientific Articles' }, preview.draft)
  assertPreviewDocument(preview, 'research-publications', item.id)
  return asPreviewMetadata({
    title: item.title,
    description: item.summary || undefined,
    openGraph: {
      title: item.title,
      description: item.summary || undefined,
    },
  }, preview.draft)
}

export default async function ArticleDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('research-publications', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<ArticleDetailSkeleton />}>
      <ArticleDetailContent slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function ArticleDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const article = await getResearchArticleBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!article) {
    notFound()
  }
  assertPreviewDocument(preview, 'research-publications', article.id)
  alignDraftPreviewPath(preview, 'research-publications', `/research/articles/${slug}`, article as unknown as Record<string, unknown>)

  return (
    <div className="min-h-screen bg-background pt-32 pb-16">
      {/* Header Info Section */}
      <ResearchHero article={article} locale={locale} />

      <DetailPageShell sidebar={<ResearchSidebar article={article} locale={locale} />}>
        <ResearchContent article={article} locale={locale} />
      </DetailPageShell>
    </div>
  )
}
