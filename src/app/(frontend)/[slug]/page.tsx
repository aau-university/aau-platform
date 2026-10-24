import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { AdminBar } from '@/components/AdminBar'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import type { Page as PageType } from '@/payload-types'
import { contentReadContext } from '@/lib/payload/content-read-context'
import {
  assertPreviewDocument,
  getDraftPreviewContextFromSearchParams,
  resolvePreviewLocale,
  type PreviewSearchParams,
  type DraftPreviewContext,
} from '@/lib/payload/preview-context'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'
import {
  applyPublicCacheTags,
  collectionCacheTag,
  pageCacheTag,
} from '@/lib/payload/cache-tags'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { buildCollectionPath } from '@/utilities/collectionRoutes'

import { PageClient } from './page.client'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

/**
 * Fully dynamic at request time (cacheComponents-native pattern). With
 * `cacheComponents: true`, the top-level `await draftMode()` and
 * `await params` calls below opt this route into per-request execution —
 * no `export const dynamic = 'force-dynamic'` is needed. Draft mode
 * gates whether draft docs are visible, so the route cannot be
 * statically prerendered from `generateStaticParams` alone.
 */

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: PreviewSearchParams
}

async function findPage(
  payload: Payload,
  slug: string,
  locale: Locale,
  preview: DraftPreviewContext,
): Promise<PageType | null> {
  if (preview.draft) {
    assertPreviewDocument(preview, 'pages', preview.documentId)
    try {
      return await payload.findByID({
        collection: 'pages',
        id: preview.documentId,
        depth: 2,
        draft: true,
        locale,
        overrideAccess: false,
        user: preview.user,
      })
    } catch {
      return null
    }
  }

  return findPublishedPageBySlug(slug, locale)
}

async function findPublishedPageBySlug(
  slug: string,
  locale: Locale,
): Promise<PageType | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('pages'), pageCacheTag(slug))
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    draft: false,
    overrideAccess: false,
    locale,
  })
  return (result.docs[0] as PageType | undefined) ?? null
}

/**
 * Build the per-page `<Metadata>` from the Page doc's SEO field group.
 *
 * Falls back to `generateMeta`'s built-in defaults when the doc is
 * missing or has no `meta` block. The slug is awaited (Next 15+ made
 * `params` an async Promise).
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const payload = await getPayload({ config: configPromise })
  const doc = await findPage(payload, slug, locale, preview)
  if (doc) assertPreviewDocument(preview, 'pages', doc.id)

  return asPreviewMetadata(
    generateMeta({ doc, collectionSlug: 'pages', locale }),
    preview.draft,
  )
}

/**
 * `[slug]` catch-all route. Renders any `pages` document by slug.
 *
 * Flow:
 *   1. `await params` — Next 15+ made `params` an async Promise.
 *   2. `await draftMode()` — also async in Next 15+.
 *   3. Ask the official redirects-plugin adapter if this URL should 307/301
 *      to a different one — it returns `null` or throws via
 *      `redirect()` internally.
 *   4. Fetch the page via Payload Local API. Draft requests use the
 *      Redis-session-bound document id with `draft: true`, the authenticated user,
 *      and `overrideAccess: false`. Published requests use a cached,
 *      access-controlled slug query.
 *   5. `notFound()` if no doc matches — Next renders the closest
 *      `not-found.tsx`.
 *   6. Render the editor bar, page client, optional
 *      `<RenderHero>` + `<RenderBlocks>`. The live-preview bridge
 *      (`LivePreviewListener`) is mounted once by the frontend layout,
 *      gated on `draftMode().isEnabled` — not here, to avoid a duplicate
 *      subscription per page.
 *
 * The hero + blocks render behind a `<Suspense>` boundary because both
 * `RenderBlocks` and `RenderHero` are async server components (they may
 * call Payload Local API loaders for nested data — e.g. the NewsGrid
 * block fetches the latest news). cacheComponents requires async
 * content inside Suspense OR marked `'use cache'`; the route is fully
 * dynamic via the top-level dynamic-API reads (`draftMode`, `params`),
 * but Suspense is still best practice so the static shell streams
 * immediately and the dynamic content streams in.
 */
export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params
  const [requestedLocale, preview] = await Promise.all([
    resolveLocale(),
    getDraftPreviewContextFromSearchParams(searchParams),
  ])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const payload = await getPayload({ config: configPromise })

  // Stub — PR-015 wires this to the redirects plugin. Returns null or
  // throws NEXT_REDIRECT internally. The `await` is intentional: a
  // future real implementation will be async (it queries the redirects
  // plugin via the Local API).
  const requestedPath = buildCollectionPath('pages', slug)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  const doc = await findPage(payload, slug, locale, preview)
  if (!doc) notFound()
  assertPreviewDocument(preview, 'pages', doc.id)
  alignDraftPreviewPath(preview, 'pages', `/${slug}`, doc as unknown as Record<string, unknown>)
  const hasHero = Boolean(doc.hero?.type)
  const heading = doc.title?.trim() || slug.replaceAll('-', ' ')

  return (
    <>
      <AdminBar />
      <PageClient />
      <div id="main-content" className="min-h-[60vh] bg-background">
        {hasHero ? (
          <Suspense>
            <RenderHero hero={doc.hero} />
          </Suspense>
        ) : (
          <header className="border-b border-border/60 bg-muted/20 py-12 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-balance max-w-4xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
                {heading}
              </h1>
            </div>
          </header>
        )}
        <div className={hasHero ? undefined : 'pt-4 sm:pt-6'}>
          <Suspense>
            <RenderBlocks
              blocks={doc.layout}
              locale={locale}
              readContext={contentReadContext(preview.draft, preview.user)}
            />
          </Suspense>
        </div>
      </div>
    </>
  )
}
