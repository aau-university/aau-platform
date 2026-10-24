import type { Locale, LocalizedText } from '@/i18n/locale'

/**
 * Public navigation inventory.
 *
 * Ported from `frontend/config/routes.ts`. The legacy site uses 9 top-level
 * nav items; we keep the same shape so the header markup matches. Long term
 * this should be replaced by a Payload `navigation-menus` lookup
 * (the global already exists). For this port we keep both code paths:
 *   - `PUBLIC_ROUTES` ships in the bundle as a fallback / SSR seed
 *   - `getPublicNavigation()` (see lib/payload/get-public-navigation.ts)
 *     resolves the CMS value when Payload is reachable and falls back to
 *     this list otherwise.
 */

export interface PublicNavChild {
  /** Stable identifier (used for keys + tests). */
  key: string
  /** Visible label after locale resolution. */
  label: string
  /** Destination URL. */
  href: string
  /** Optional short description shown under the label in dropdowns. */
  description?: string
  /** Open the link in a new tab. */
  openInNewTab: boolean
}

export interface PublicNavItem {
  /** Stable identifier (used for keys + tests). */
  key: string
  /** Visible label after locale resolution. */
  label?: string
  /** Static labels keyed by locale. CMS-resolved items may only have `label`. */
  labels?: LocalizedText
  /** Destination URL (always relative, always rooted at /). */
  href: string
  /** Whether this item is shown in the primary header navigation. */
  inMainNav: boolean
  /** Open the link in a new tab. */
  openInNewTab?: boolean
  /** Move this item into the "More" overflow dropdown. */
  showInMore?: boolean
  /** Child items rendered as a hover dropdown (desktop) / accordion (mobile). */
  children?: PublicNavChild[]
}

export const PUBLIC_ROUTES: PublicNavItem[] = [
  { key: 'home', labels: { ar: 'الرئيسية', en: 'Home' }, href: '/', inMainNav: true, openInNewTab: false, showInMore: false },
  { key: 'about', labels: { ar: 'عن الجامعة', en: 'About' }, href: '/about', inMainNav: true, openInNewTab: false, showInMore: false },
  { key: 'colleges', labels: { ar: 'الكليات', en: 'Colleges' }, href: '/colleges', inMainNav: true, openInNewTab: false, showInMore: false },
  {
    key: 'campus-life',
    labels: { ar: 'الحياة الجامعية', en: 'Campus Life' },
    href: '/campus-life',
    inMainNav: true,
    openInNewTab: false,
    showInMore: true,
  },
  { key: 'research', labels: { ar: 'البحث العلمي', en: 'Research' }, href: '/research', inMainNav: true, openInNewTab: false, showInMore: true },
  { key: 'news', labels: { ar: 'الأخبار', en: 'News' }, href: '/news', inMainNav: true, openInNewTab: false, showInMore: false },
  { key: 'admission', labels: { ar: 'القبول', en: 'Admission' }, href: '/admission', inMainNav: true, openInNewTab: false, showInMore: false },
  { key: 'contact', labels: { ar: 'تواصل معنا', en: 'Contact' }, href: '/contact', inMainNav: true, openInNewTab: false, showInMore: false },
]

export const MAIN_NAV: PublicNavItem[] = PUBLIC_ROUTES.filter((r) => r.inMainNav)

export function getPublicRouteLabel(item: PublicNavItem, locale: Locale): string {
  return item.label ?? item.labels?.[locale] ?? ''
}

export function getMainNav(locale: Locale): PublicNavItem[] {
  return MAIN_NAV.map((item) => ({
    ...item,
    label: getPublicRouteLabel(item, locale),
  }))
}
