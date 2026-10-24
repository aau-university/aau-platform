import type { Locale } from '@/i18n/locale'
import type { FooterSetting } from '@/payload-types'

import { applyPublicCacheTags, globalCacheTag } from './cache-tags'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { resolveMediaUrl } from './resolve-media'

// ── Types ────────────────────────────────────────────────────────

export interface PublicFooterItem {
  label: string
  href: string
  newTab: boolean
  /** Column / group label (e.g. "Quick Links", "Services", "Support"). */
  group: string | null
}

export interface PublicFooterSettings {
  footerItems: PublicFooterItem[]
  footerBackgroundType: 'none' | 'image' | 'video'
  footerBackgroundImage: string | null
  footerBackgroundVideo: string | null
  footerBackgroundOverlayOpacity: number
  hideFooterSignup: boolean
  address: string | null
  footerPowered: string | null
}

export interface GetPublicFooterSettingsOptions {
  locale?: Locale
}

// ── Helpers ──────────────────────────────────────────────────────

const FALLBACK: PublicFooterSettings = {
  footerItems: [],
  footerBackgroundType: 'none',
  footerBackgroundImage: null,
  footerBackgroundVideo: null,
  footerBackgroundOverlayOpacity: 0.65,
  hideFooterSignup: true,
  address: null,
  footerPowered: null,
}

type FooterItemLink = NonNullable<
  NonNullable<FooterSetting['footerItems']>[number]['link']
>

/**
 * Resolve an owner-derived footer link into a public `{ href, newTab }` pair.
 * Returns `null` for the href when the link has no usable target.
 */
function resolveLinkField(link: FooterItemLink | null | undefined): {
  href: string | null
  newTab: boolean
} {
  if (!link || typeof link !== 'object') {
    return { href: null, newTab: false }
  }
  const newTab = Boolean(link.newTab)

  if (link.type === 'custom' && typeof link.url === 'string' && link.url) {
    return { href: link.url, newTab }
  }

  if (link.type === 'reference' && link.reference) {
    const value = link.reference.value
    if (value && typeof value === 'object' && 'slug' in value) {
      const slug = (value as { slug?: string }).slug
      if (typeof slug === 'string' && slug) {
        return { href: slug === 'home' ? '/' : `/${slug}`, newTab }
      }
    }
  }

  return { href: null, newTab: false }
}

function mapFooterSettings(doc: FooterSetting): PublicFooterSettings {
  // footerItems — resolve each item's link + group
  const rawItems = Array.isArray(doc.footerItems) ? doc.footerItems : []
  const footerItems: PublicFooterItem[] = rawItems
    .map((item): PublicFooterItem | null => {
      const label = typeof item.label === 'string' ? item.label : ''
      const resolved = resolveLinkField(item.link)
      const href = resolved.href ?? ''
      if (!label || !href) return null
      return {
        label,
        href,
        newTab: resolved.newTab,
        group: typeof item.group === 'string' && item.group ? item.group : null,
      }
    })
    .filter((x): x is PublicFooterItem => x !== null)

  // Background media
  const bgType =
    doc.footerBackgroundType === 'image' ||
    doc.footerBackgroundType === 'video'
      ? doc.footerBackgroundType
      : 'none'

  return {
    footerItems,
    footerBackgroundType: bgType,
    footerBackgroundImage:
      bgType === 'image' ? (resolveMediaUrl(doc.footerBackgroundImage) ?? null) : null,
    footerBackgroundVideo:
      bgType === 'video' ? (resolveMediaUrl(doc.footerBackgroundVideo) ?? null) : null,
    footerBackgroundOverlayOpacity:
      typeof doc.footerBackgroundOverlayOpacity === 'number'
        ? doc.footerBackgroundOverlayOpacity
        : 0.65,
    hideFooterSignup: Boolean(doc.hideFooterSignup),
    address:
      typeof doc.address === 'string' && doc.address ? doc.address : null,
    footerPowered:
      typeof doc.footerPowered === 'string' && doc.footerPowered
        ? doc.footerPowered
        : null,
  }
}

// ── Loader ───────────────────────────────────────────────────────

/**
 * Fetch the `footer-settings` global for public rendering.
 *
 * Cached via `'use cache'` + the global cache tag. Falls back to a safe
 * default (empty footer items, no background) when Payload is unreachable.
 */
export async function getPublicFooterSettings(
  options: GetPublicFooterSettingsOptions = {},
): Promise<PublicFooterSettings> {
  try {
    return await getPublicFooterSettingsStrict(options)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getPublicFooterSettings] read failed; using fallback.', err)
    }
    return FALLBACK
  }
}

async function getPublicFooterSettingsStrict(
  options: GetPublicFooterSettingsOptions,
): Promise<PublicFooterSettings> {
  'use cache'

  applyPublicCacheTags(globalCacheTag('footer-settings'))

  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  const locale = options.locale ?? ('ar' as Locale)

  const doc = (await payload.findGlobal({
    slug: 'footer-settings',
    locale,
    depth: 1,
    overrideAccess: false,
  })) as FooterSetting

  return mapFooterSettings(doc)
}
