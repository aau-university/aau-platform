import type { Metadata } from 'next'

import type { Media, Page } from '@/payload-types'
import type { Locale } from '@/i18n/locale'

import {
  resolveCollectionDependentPath,
  resolveCollectionPath,
} from './collectionRoutes'
import { getMediaUrl } from './getMediaUrl'
import { getServerSideURL } from './getURL'
import { mergeOpenGraph } from './mergeOpenGraph'

/**
 * Minimal shape `generateMeta` needs from a doc. All fields are optional
 * because globals (e.g. AboutPage) do not carry `slug` / `meta` / `title`
 * at the document root — they have their own header/group structure.
 *
 * The implementation reads every property defensively with `?.`, so
 * passing a `Partial<…>`-style object is safe. `Page` and `BlogPost`
 * still satisfy this type because they have all three properties (with
 * `meta` already optional on those collections).
 */
type MetaDoc = {
  academicProgram?: unknown
  college?: unknown
  dependentSegment?: string
  meta?: Page['meta']
  path?: string
  slug?: string | null
  title?: string | null
}

export interface GenerateMetaArgs {
  doc: MetaDoc | null | undefined
  /** Collection slug the doc belongs to (used to build canonical URL). */
  collectionSlug?: string
  /** Global slug the doc belongs to (used to build canonical URL for globals). */
  globalSlug?: string
  /** Optional comma-separated keywords. Merged into metadata as `keywords`. */
  keywords?: string | string[] | null
  locale?: Locale
}

/**
 * Build a Next.js {@link Metadata} object for a page/post/global doc.
 *
 * Respects the SEO plugin field shape (`doc.meta.title`, `.description`,
 * `.image`). Falls back to `doc.title` when `meta.title` is missing, and
 * to {@link SITE_NAME} when neither is present.
 */
export const generateMeta = (args: GenerateMetaArgs): Metadata => {
  const { doc, collectionSlug, globalSlug, keywords, locale } = args

  const metaTitle = doc?.meta?.title ?? null
  const title = metaTitle ?? doc?.title ?? undefined

  const description = doc?.meta?.description ?? undefined

  const ogImage = resolveImage(doc?.meta?.image)

  const url = buildUrl(doc, collectionSlug, globalSlug)

  const openGraph = mergeOpenGraph({
    title,
    description: description ?? '',
    url,
    images: ogImage ? [{ url: ogImage }] : undefined,
    locale,
  })

  const metadata: Metadata = {
    title,
    description,
    openGraph,
  }

  // Only advertise a canonical when we could resolve a real URL. Emitting
  // `canonical: undefined` is harmless, but omitting the key entirely keeps
  // the intent explicit: no URL means no claim about which page is
  // authoritative, rather than a guess that 404s.
  if (url) {
    metadata.alternates = { canonical: url }
  }

  if (keywords) {
    metadata.keywords = Array.isArray(keywords) ? keywords : keywords.split(',').map((k) => k.trim()).filter(Boolean)
  }

  return metadata
}

function resolveImage(
  image: (number | null) | Media | undefined,
): string | undefined {
  if (!image || typeof image === 'number') return undefined
  return getMediaUrl(image) || undefined
}

function buildUrl(
  doc: MetaDoc | null | undefined,
  collectionSlug: string | undefined,
  globalSlug: string | undefined,
): string | undefined {
  const base = getServerSideURL()
  if (!doc) return undefined

  // Collection URLs must always come from the registry. A caller-provided path
  // must never bypass collection route or relationship validation.
  if (collectionSlug) {
    const path = doc.dependentSegment
      ? resolveCollectionDependentPath(collectionSlug, doc.dependentSegment, doc)
      : resolveCollectionPath(collectionSlug, doc)
    if (path) return `${base}${path}`

    // Fail closed when a registered collection cannot resolve its route.
    return undefined
  }

  // Derived pages and globals may have a trusted public route that differs
  // from their Payload global slug (for example `/about` vs `about-page`).
  const explicitPath = typeof doc.path === 'string' ? doc.path.trim() : ''
  if (explicitPath) {
    return `${base}${explicitPath.startsWith('/') ? explicitPath : `/${explicitPath}`}`
  }

  if (globalSlug) {
    return `${base}/${globalSlug}`
  }

  const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''
  if (!slug) return `${base}/`
  return `${base}/${slug}`
}

export default generateMeta
