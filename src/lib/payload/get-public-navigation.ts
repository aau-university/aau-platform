import { getMainNav, type PublicNavItem } from '@/lib/site/public-routes'
import type { Locale } from '@/i18n/locale'
import type { NavigationMenu } from '@/payload-types'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'

/**
 * Resolve the public navigation.
 *
 * Looks for the `navigation-menus` collection entry with `key === 'main'`.
 * Falls back to the static `MAIN_NAV` constant when the document is
 * missing or when Payload is unreachable, so the public header always
 * renders.
 *
 * Returns a tree structure: top-level items may carry `children` (for
 * hover dropdowns) and `showInMore` (to move the item into the "More"
 * overflow menu).
 */
export async function getPublicNavigation(locale: Locale = 'ar'): Promise<PublicNavItem[]> {
  try {
    return await getPublicNavigationStrict(locale)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getPublicNavigation] read failed; using fallback.', err)
    }
    return getMainNav(locale)
  }
}

async function getPublicNavigationStrict(locale: Locale): Promise<PublicNavItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('navigation-menus'))

  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  // depth: 1 so the `children` localized arrays resolve to objects (not bare IDs).
  const result = await payload.find({
    collection: 'navigation-menus',
    where: {
      and: [{ key: { equals: 'main' } }, { isPublished: { equals: true } }],
    },
    limit: 1,
    depth: 1,
    locale,
    overrideAccess: false,
  })

  const doc = result.docs[0] as NavigationMenu | undefined
  const items = doc?.items ?? []
  if (items.length === 0) return getMainNav(locale)

  const sorted = [...items].sort((a, b) => {
    const oa = typeof a.order === 'number' ? a.order : 0
    const ob = typeof b.order === 'number' ? b.order : 0
    return oa - ob
  })

  return sorted
    .map((item, idx): PublicNavItem | null => {
      const label = typeof item.label === 'string' ? item.label : ''
      const href = typeof item.url === 'string' ? item.url : ''
      if (!label || !href) return null

      // Map children (dropdown items)
      const rawChildren = Array.isArray(item.children) ? item.children : []
      const children = rawChildren
        .slice()
        .sort((a, b) => {
          const oa = typeof a.order === 'number' ? a.order : 0
          const ob = typeof b.order === 'number' ? b.order : 0
          return oa - ob
        })
        .map((child, cidx) => {
          const childLabel = typeof child.label === 'string' ? child.label : ''
          const childHref = typeof child.url === 'string' ? child.url : ''
          const childDesc =
            typeof child.description === 'string' ? child.description : undefined
          return {
            key: `cms-${idx}-${cidx}`,
            label: childLabel,
            href: childHref,
            description: childDesc,
            openInNewTab: Boolean(child.openInNewTab),
          }
        })
        .filter((c) => c.label && c.href)

      return {
        key: `cms-${idx}`,
        label,
        href,
        openInNewTab: Boolean(item.openInNewTab),
        showInMore: Boolean(item.showInMore),
        inMainNav: true,
        children: children.length > 0 ? children : undefined,
      }
    })
    .filter((x): x is PublicNavItem => x !== null)
}
