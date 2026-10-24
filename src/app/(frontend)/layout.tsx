import type { Metadata } from 'next'
import { cookies, draftMode } from 'next/headers'
import { Tajawal, Cairo } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Suspense, type ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { DEFAULT_LOCALE, LANG_COOKIE, getDirection, isLocale, type Locale } from '@/i18n/locale'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { MainLayout } from '@/components/site/MainLayout'
import { getPublicNavigation } from '@/lib/payload/get-public-navigation'
import { getPublicNavbarSettings } from '@/lib/payload/get-public-navbar-settings'
import { getPublicFooterSettings } from '@/lib/payload/get-public-footer-settings'
import { getPublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import './styles.css'

// Load fonts via next/font (self-hosted, no Google Fonts <link>)
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
})

/**
 * Public layout.
 *
 * - Keeps request-bound locale/header/footer data behind a Suspense
 *   boundary, as required by Next.js cacheComponents.
 * - Loads the public navigation + site settings + navbar + footer settings
 *   via the Payload Local API (with a safe fallback when the DB is
 *   unreachable) so the header and footer never crash the page.
 * - `generateMetadata` reads `siteName` + `description` from SiteSettings
 *   so the browser tab title and OG tags stay in sync with the CMS.
 * - Hands off to the client `LanguageProvider`, which handles
 *   in-page toggling without navigation.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  const locale: Locale = isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
  const settings = await getPublicSiteSettings(locale)
  const siteName = settings.siteName || 'جامعة الجيل الجديد'
  const description = settings.description || 'منصة جامعة الجيل الجديد'

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
    title: {
      template: `%s | ${siteName}`,
      default: siteName,
    },
    description,
    alternates: { languages: { ar: '/', en: '/' } },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName,
      title: siteName,
      description,
    },
  }
}

async function resolveInitialLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  return DEFAULT_LOCALE
}

function PublicShellFallback({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider initialLanguage={DEFAULT_LOCALE}>
      <main className="pt-20">{children}</main>
    </LanguageProvider>
  )
}

/**
 * Inline blocking script that runs before React hydration. Reads the
 * `aau_lang` cookie and corrects `<html lang dir>` so the SSR-default
 * attributes (Arabic / RTL) are flipped to the visitor's preference
 * before first paint — eliminating the LTR→RTL flash English visitors
 * used to see. The script is intentionally tiny (no React, no parsing
 * beyond the cookie) so it executes synchronously in the head without
 * blocking hydration.
 *
 * Note: with `cacheComponents: true`, reading `cookies()` directly in
 * `RootLayout` would force the entire route into dynamic rendering and
 * break Partial Prerender for static pages. This client-side approach
 * keeps the layout statically renderable while still fixing the a11y /
 * SEO issue at first paint. The `LanguageProvider`'s post-hydration
 * `useEffect` continues to keep the attributes in sync on toggle.
 */
const LOCALE_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )aau_lang=([^;]+)/);var l=m?decodeURIComponent(m[1]):'';if(l!=='ar'&&l!=='en'){l='ar';}var d=l==='ar'?'rtl':'ltr';var h=document.documentElement;h.setAttribute('lang',l);h.setAttribute('dir',d);}catch(e){}})();`

/**
 * Draft-mode toolbar shell. Mounted only when `draftMode().isEnabled`
 * is true (i.e. an editor is previewing via `/next/preview`). Wraps
 * the official Live Preview refresh bridge and editor toolbar in their own
 * `<Suspense>` boundary. They are mounted only for an authenticated Draft
 * request; public rendering does not initialize Preview infrastructure.
 */
function DraftTools() {
  return (
    <Suspense fallback={null}>
      <LivePreviewListener />
      <AdminBar />
    </Suspense>
  )
}

async function PublicShell({ children }: { children: ReactNode }) {
  const initialLocale = await resolveInitialLocale()
  const draft = await draftMode()
  const [nav, settings, navbarSettings, footerSettings] = await Promise.all([
    getPublicNavigation(initialLocale),
    getPublicSiteSettings(initialLocale),
    getPublicNavbarSettings({ locale: initialLocale }),
    getPublicFooterSettings({ locale: initialLocale }),
  ])

  return (
    <LanguageProvider initialLanguage={initialLocale}>
      {draft.isEnabled ? <DraftTools /> : null}
      <SiteHeader nav={nav} settings={settings} navbarSettings={navbarSettings} />
      <MainLayout>{children}</MainLayout>
      <SiteFooter nav={nav} settings={settings} footerSettings={footerSettings} />
    </LanguageProvider>
  )
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Render the SSR `<html lang dir>` with the default locale (Arabic / RTL)
  // and rely on the blocking `LOCALE_INIT_SCRIPT` (below) to flip the
  // attributes to the visitor's cookie preference before first paint.
  // See the script's docstring for why we don't `await cookies()` here.
  const dir = getDirection(DEFAULT_LOCALE)

  return (
    <html lang={DEFAULT_LOCALE} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
      </head>
      <body className={`${tajawal.variable} ${cairo.variable} antialiased bg-background text-foreground font-sans`}>
        <NuqsAdapter>
          <Suspense fallback={<PublicShellFallback>{children}</PublicShellFallback>}>
            <PublicShell>{children}</PublicShell>
          </Suspense>
        </NuqsAdapter>
      </body>
    </html>
  )
}
