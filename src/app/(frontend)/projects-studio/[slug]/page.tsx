import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getProjectBySlug } from '@/lib/payload/get-public-projects'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { ProjectHero, ProjectContent, ProjectSidebar } from '@/components/pages/project-detail'
import { ProjectDetailSkeleton } from './skeleton'
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
  const item = await getProjectBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!item) return asPreviewMetadata({ title: 'Projects Studio' }, preview.draft)
  assertPreviewDocument(preview, 'projects', item.id)
  return asPreviewMetadata({
    title: item.title,
    description: item.description || undefined,
    openGraph: {
      title: item.title,
      description: item.description || undefined,
    },
  }, preview.draft)
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('projects', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetailContent slug={slug} locale={locale} preview={preview} />
    </Suspense>
  )
}

async function ProjectDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  const project = await getProjectBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!project) {
    notFound()
  }
  assertPreviewDocument(preview, 'projects', project.id)
  alignDraftPreviewPath(preview, 'projects', `/projects-studio/${slug}`, project as unknown as Record<string, unknown>)

  return (
    <div className="min-h-screen bg-background pt-32 pb-16">
      {/* Detail Page Header (Breadcrumbs, title, year, status badges) */}
      <ProjectHero project={project} locale={locale} />

      <DetailPageShell sidebar={<ProjectSidebar project={project} locale={locale} />}>
        <ProjectContent project={project} locale={locale} />
      </DetailPageShell>
    </div>
  )
}
