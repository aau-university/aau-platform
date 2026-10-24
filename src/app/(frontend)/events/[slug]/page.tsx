import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import {
  EventDetailHero,
  EventDetailMeta,
  EventDetailContent,
  EventDetailSidebar,
} from '@/components/pages/event-detail'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicEventBySlug, getPublicEvents } from '@/lib/payload/get-public-events'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { contentReadContext } from '@/lib/payload/content-read-context'
import { buildCollectionPath } from '@/utilities/collectionRoutes'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import { EventDetailSkeleton } from './skeleton'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

type EventDetailPageProps = {
  params: Promise<{ slug: string }>
  searchParams: PreviewSearchParams
}

export async function generateMetadata({ params, searchParams }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const event = await getPublicEventBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!event) return asPreviewMetadata({ title: 'Events' }, preview.draft)
  assertPreviewDocument(preview, 'events', event.id)
  return asPreviewMetadata(generateMeta({
    doc: event,
    collectionSlug: 'events',
    locale,
  }), preview.draft)
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildCollectionPath('events', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetailBody slug={slug} preview={preview} locale={locale} />
    </Suspense>
  )
}

async function EventDetailBody({
  slug,
  preview,
  locale,
}: {
  slug: string
  preview: Awaited<ReturnType<typeof getDraftPreviewContextFromSearchParams>>
  locale: Locale
}) {
  const event = await getPublicEventBySlug(slug, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })

  if (!event) notFound()
  assertPreviewDocument(preview, 'events', event.id)
  alignDraftPreviewPath(preview, 'events', `/events/${slug}`, event as unknown as Record<string, unknown>)

  // Fetch related events excluding the current one
  const related = (await getPublicEvents({
    locale,
    limit: 5,
    readContext: contentReadContext(preview.draft, preview.user),
  })).filter((e) => e.slug !== slug)

  return (
    <article className="min-h-screen bg-background">
      <EventDetailHero event={event} locale={locale} />

      <DetailPageShell
        sidebar={<EventDetailSidebar related={related} locale={locale} currentSlug={slug} />}
      >
        <div className="space-y-8">
          <EventDetailMeta event={event} locale={locale} />
          <EventDetailContent event={event} locale={locale} />
        </div>
      </DetailPageShell>
    </article>
  )
}
