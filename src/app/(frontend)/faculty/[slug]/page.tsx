import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getPublicFacultyBySlug } from '@/lib/payload/get-public-faculty'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import {
  FacultyHero,
  FacultyInfo,
  FacultySidebar,
} from '@/components/pages/faculty-detail'
import { FacultyDetailSkeleton } from './skeleton'

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
  const member = await getPublicFacultyBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (member) assertPreviewDocument(preview, 'faculty-members', member.id)

  return asPreviewMetadata(generateMeta({
    doc: member
      ? { meta: member.meta, title: member.fullName, slug: member.slug }
      : null,
    collectionSlug: 'faculty-members',
    locale,
  }), preview.draft)
}

export default async function FacultyDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('faculty-members', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<FacultyDetailSkeleton />}>
        <FacultyDetailContent slug={slug} locale={locale} preview={preview} />
      </Suspense>
    </div>
  )
}

async function FacultyDetailContent({
  slug,
  locale,
  preview,
}: {
  slug: string
  locale: Locale
  preview: Awaited<ReturnType<typeof getDraftPreviewContextFromSearchParams>>
}) {
  const member = await getPublicFacultyBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!member) notFound()
  assertPreviewDocument(preview, 'faculty-members', member.id)
  alignDraftPreviewPath(preview, 'faculty-members', `/faculty/${slug}`, member as unknown as Record<string, unknown>)

  return (
    <div className="min-h-screen bg-background">
      <FacultyHero member={member} locale={locale} />
      <FacultyInfo
        member={member}
        locale={locale}
        sidebar={<FacultySidebar member={member} locale={locale} />}
      />
    </div>
  )
}
