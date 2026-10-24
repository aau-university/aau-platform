import type { Locale } from '@/i18n/locale'
import type { Slider } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { buildActiveWhere } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'

// ── Types ────────────────────────────────────────────────────────

export interface PublicSliderItem {
  id: string
  title: string
  subtitle: string
  image: string | null
  linkUrl: string | null
  linkNewTab: boolean
  displayOrder: number
}

export interface GetPublicSlidersOptions {
  locale?: Locale
  /** Hard cap on returned items (defaults to 10). */
  limit?: number
}

// ── Helpers ──────────────────────────────────────────────────────

const ACTIVE_WHERE = buildActiveWhere('isActive')

function resolveLinkUrl(link: Slider['link']): string | null {
  if (!link || typeof link !== 'object') return null

  // `type === 'custom'` → use the raw `url` field
  if (link.type === 'custom') {
    return typeof link.url === 'string' && link.url.length > 0 ? link.url : null
  }

  // `type === 'reference'` → resolve the referenced Page slug to `/slug`
  if (link.type === 'reference' && link.reference) {
    const value = link.reference.value
    if (value && typeof value === 'object' && 'slug' in value) {
      const slug = (value as { slug?: string }).slug
      if (typeof slug === 'string' && slug.length > 0) {
        return slug === 'home' ? '/' : `/${slug}`
      }
    }
  }

  return null
}

function mapListItem(doc: Slider): PublicSliderItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    subtitle: typeof doc.subtitle === 'string' ? doc.subtitle : '',
    image: resolveMediaUrl(doc.image) ?? null,
    linkUrl: resolveLinkUrl(doc.link),
    linkNewTab: Boolean(doc.link?.newTab),
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

// ── Loader ───────────────────────────────────────────────────────

/**
 * Fetch active slider items for the public homepage hero carousel.
 *
 * `Sliders` is an institutional collection (no `versions.drafts`), so the
 * publishing filter is the single-field `isActive: true`. Results are sorted
 * by `displayOrder` ascending.
 */
export async function getPublicSliders(
  options: GetPublicSlidersOptions = {},
): Promise<PublicSliderItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('sliders'))

  try {
    const payload = await getPayloadSafe()
    if (!payload) return []

    const locale = options.locale ?? ('ar' as Locale)
    const limit = Math.max(1, Math.min(10, Math.trunc(options.limit ?? 10)))

    const result = await payload.find({
      collection: 'sliders',
      where: ACTIVE_WHERE,
      limit,
      depth: 1,
      locale,
      sort: 'displayOrder',
      overrideAccess: false,
    })

    return result.docs.map((doc: Slider) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}
