import type { Locale } from '@/i18n/locale'
import type { NavbarSetting } from '@/payload-types'

import { applyPublicCacheTags, globalCacheTag } from './cache-tags'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'

// ── Types ────────────────────────────────────────────────────────

export interface PublicNavbarTopBarItem {
  label: string
  href: string
  newTab: boolean
}

export interface PublicNavbarSettings {
  topBarItems: PublicNavbarTopBarItem[]
  hideLogin: boolean
  showLanguagePicker: boolean
  callToAction: {
    label: string | null
    href: string | null
    newTab: boolean
    appearance: 'default' | 'secondary' | 'ghost' | 'outline' | null
  } | null
}

export interface GetPublicNavbarSettingsOptions {
  locale?: Locale
}

// ── Helpers ──────────────────────────────────────────────────────

const FALLBACK: PublicNavbarSettings = {
  topBarItems: [],
  hideLogin: false,
  showLanguagePicker: true,
  callToAction: null,
}

type NavbarTopBarLink = NonNullable<
  NonNullable<NavbarSetting['topBarItems']>[number]['link']
>
type NavbarCallToActionLink = NonNullable<NavbarSetting['callToAction']>
type NavbarLink = NavbarTopBarLink | NavbarCallToActionLink

/**
 * Resolve an owner-derived navbar link into a public `{ href, newTab }` pair.
 * Returns `null` for the href when the link has no usable target.
 */
function resolveLinkField(link: NavbarLink | null | undefined): {
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

  return { href: null, newTab }
}

function mapNavbarSettings(doc: NavbarSetting): PublicNavbarSettings {
  // topBarItems
  const rawTopBar = Array.isArray(doc.topBarItems) ? doc.topBarItems : []
  const topBarItems: PublicNavbarTopBarItem[] = rawTopBar
    .map((item): PublicNavbarTopBarItem | null => {
      const label = typeof item.label === 'string' ? item.label : ''
      const resolved = resolveLinkField(item.link)
      const href = resolved.href ?? ''
      if (!label || !href) return null
      // `openInNewTab` checkbox on the item overrides the link's newTab
      return {
        label,
        href,
        newTab: Boolean(item.openInNewTab) || resolved.newTab,
      }
    })
    .filter((x): x is PublicNavbarTopBarItem => x !== null)

  const ctaLink = doc.callToAction ?? null
  const ctaResolved = resolveLinkField(ctaLink)
  const ctaAppearance = ctaLink?.appearance ?? null
  const callToAction: PublicNavbarSettings['callToAction'] =
    ctaResolved.href != null
      ? {
          label: null, // The link group has no label; the UI provides fallback text
          href: ctaResolved.href,
          newTab: ctaResolved.newTab,
          appearance:
            ctaAppearance === 'default' ||
            ctaAppearance === 'secondary' ||
            ctaAppearance === 'ghost' ||
            ctaAppearance === 'outline'
              ? ctaAppearance
              : null,
        }
      : null

  return {
    topBarItems,
    hideLogin: Boolean(doc.hideLogin),
    showLanguagePicker: doc.showLanguagePicker !== false,
    callToAction,
  }
}

// ── Loader ───────────────────────────────────────────────────────

/**
 * Fetch the `navbar-settings` global for public rendering.
 *
 * Cached via `'use cache'` + the global cache tag. Falls back to a safe
 * default (empty top bar, language picker shown, no CTA) when Payload is
 * unreachable.
 */
export async function getPublicNavbarSettings(
  options: GetPublicNavbarSettingsOptions = {},
): Promise<PublicNavbarSettings> {
  try {
    return await getPublicNavbarSettingsStrict(options)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getPublicNavbarSettings] read failed; using fallback.', err)
    }
    return FALLBACK
  }
}

async function getPublicNavbarSettingsStrict(
  options: GetPublicNavbarSettingsOptions,
): Promise<PublicNavbarSettings> {
  'use cache'

  applyPublicCacheTags(globalCacheTag('navbar-settings'))

  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  const locale = options.locale ?? ('ar' as Locale)

  const doc = (await payload.findGlobal({
    slug: 'navbar-settings',
    locale,
    depth: 1,
    overrideAccess: false,
  })) as NavbarSetting

  return mapNavbarSettings(doc)
}
