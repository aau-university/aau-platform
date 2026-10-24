import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_HOME_LAYOUT_AR, DEFAULT_HOME_LAYOUT_EN } from '@/blocks/defaultHomeLayout'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { HomeSkeleton } from '@/components/common/HomeSkeleton'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale } from '@/i18n/locale'
import { getPublicPageBySlug } from '@/lib/payload/get-public-page'
import { contentReadContext } from '@/lib/payload/content-read-context'
import {
  assertPreviewDocument,
  getDraftPreviewContextFromSearchParams,
  resolvePreviewLocale,
  type PreviewSearchParams,
} from '@/lib/payload/preview-context'
import { generateMeta } from '@/utilities/generateMeta'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { PayloadRedirects } from '@/components/PayloadRedirects'

async function resolveLocale() {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

async function HomeBody({ searchParams }: { searchParams: PreviewSearchParams }) {
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  if (!preview.draft) await PayloadRedirects({ url: '/' })
  const page = await getPublicPageBySlug('home', {
    locale,
    draft: preview.draft,
    documentId: preview.documentId ?? undefined,
    user: preview.user ?? undefined,
  })
  if (preview.draft && !page) notFound()
  if (page) assertPreviewDocument(preview, 'pages', page.id)
  if (page) alignDraftPreviewPath(preview, 'pages', '/', page as unknown as Record<string, unknown>)

  const fallbackLayout = locale === 'en' ? DEFAULT_HOME_LAYOUT_EN : DEFAULT_HOME_LAYOUT_AR
  const layout = preview.draft
    ? (page?.layout ?? [])
    : page?.layout && page.layout.length > 0
      ? page.layout
      : fallbackLayout

  return (
    <div id="main-content">
      <RenderBlocks
        blocks={layout}
        locale={locale}
        readContext={contentReadContext(preview.draft, preview.user)}
      />
    </div>
  )
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PreviewSearchParams
}): Promise<Metadata> {
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const page = await getPublicPageBySlug('home', {
    locale,
    draft: preview.draft,
    documentId: preview.documentId ?? undefined,
    user: preview.user ?? undefined,
  })
  if (!page) {
    if (preview.draft) notFound()
    return {}
  }
  assertPreviewDocument(preview, 'pages', page.id)

  return asPreviewMetadata(
    generateMeta({
      doc: page,
      collectionSlug: 'pages',
      locale,
    }),
    preview.draft,
  )
}

export default function HomePage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeBody searchParams={searchParams} />
    </Suspense>
  )
}
