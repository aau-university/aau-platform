import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import {
  BlogDetailHero,
  BlogDetailContent,
  BlogDetailSidebar,
} from '@/components/pages/blog-detail'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicBlogPostBySlug, getPublicBlogPosts } from '@/lib/payload/get-public-blog-posts'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { contentReadContext } from '@/lib/payload/content-read-context'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { BlogDetailSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>
  searchParams: PreviewSearchParams
}

export async function generateMetadata({ params, searchParams }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const post = await getPublicBlogPostBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!post) return asPreviewMetadata({ title: 'Blog' }, preview.draft)
  assertPreviewDocument(preview, 'blog-posts', post.id)
  return asPreviewMetadata(generateMeta({
    doc: post,
    collectionSlug: 'blog-posts',
    locale,
  }), preview.draft)
}

export default async function BlogDetailPage({ params, searchParams }: BlogDetailPageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('blog-posts', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<BlogDetailSkeleton />}>
      <BlogDetailBody slug={slug} preview={preview} locale={locale} />
    </Suspense>
  )
}

async function BlogDetailBody({
  slug,
  preview,
  locale,
}: {
  slug: string
  preview: Awaited<ReturnType<typeof getDraftPreviewContextFromSearchParams>>
  locale: Locale
}) {
  const post = await getPublicBlogPostBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!post) notFound()
  assertPreviewDocument(preview, 'blog-posts', post.id)
  alignDraftPreviewPath(preview, 'blog-posts', `/blog/${slug}`, post as unknown as Record<string, unknown>)

  // Fetch related posts excluding the current one
  const related = (await getPublicBlogPosts({
    locale,
    limit: 5,
    readContext: contentReadContext(preview.draft, preview.user),
  })).filter((p) => p.slug !== slug)

  return (
    <article className="min-h-screen bg-background">
      <BlogDetailHero post={post} locale={locale} />

      <DetailPageShell
        sidebar={
          <BlogDetailSidebar
            authorName={post.authorName}
            authorAvatarUrl={post.authorAvatarUrl}
            tags={post.tags}
            related={related}
            locale={locale}
            currentSlug={slug}
          />
        }
      >
        <BlogDetailContent post={post} locale={locale} />
      </DetailPageShell>
    </article>
  )
}
