import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_LOCALE, LANG_COOKIE, LANG_COOKIE_MAX_AGE, isLocale } from '@/i18n/locale'

/**
 * Cookie-based locale proxy.
 *
 * Strategy:
 * - Public site is a SINGLE root. There is no `/ar` or `/en` URL prefix.
 * - On the first request that lacks a valid `aau_lang` cookie, set it to the
 *   default locale (Arabic). Subsequent reads can rely on the cookie.
 * - The user's explicit choice, stored in the cookie by the client provider,
 *   wins after that.
 *
 * Crucially: this proxy does NOT redirect. The URL never changes
 * because of language. Switching language is done client-side by the
 * `LanguageProvider` without navigation.
 *
 * Payload admin and API routes are skipped entirely.
 */

const SKIP_PATTERNS: RegExp[] = [
  /^\/admin(\/.*)?$/, // Payload admin UI
  /^\/api(\/.*)?$/, // Payload REST + custom route handlers
  /^\/_next(\/.*)?$/, // Next.js internals
  /^\/_payload(\/.*)?$/, // Payload internals
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
  /\.[a-zA-Z0-9]+$/, // any file extension (.png, .svg, .json, ...)
]

function createNonce(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function buildContentSecurityPolicy(nonce: string): string {
  // Issue #9 — wire the per-request nonce into script-src so we can drop
  // both `'unsafe-inline'` and `'unsafe-eval'` for scripts. Next.js 14+
  // (with `cacheComponents: true` in next.config.ts) automatically
  // propagates the nonce from the `x-nonce` request header to all
  // framework-generated inline `<script>` tags, so PPR / static caching
  // still works without `unsafe-eval`.
  //
  // Styles remain on `'unsafe-inline'` because Next.js does NOT
  // consistently add the nonce to every generated `<style>` tag (e.g.,
  // styled-jsx, CSS-in-JS runtime injected styles). TODO(#9): once
  // Next.js lands full nonce propagation for styles, switch style-src
  // to `'self' 'nonce-${nonce}'` as well.
  const scriptSrc = ["'self'", `'nonce-${nonce}'`]

  // R1 — the blocking inline `LOCALE_INIT_SCRIPT` in (frontend)/layout.tsx
  // sets `<html lang/dir>` from the `aau_lang` cookie before first paint to
  // avoid an RTL/LTR flash. Next.js only injects the nonce into the inline
  // scripts *it* generates; our hand-written `<script dangerouslySetInnerHTML>`
  // is not nonce-tagged, so the strict CSP blocks it and the a11y/SEO fix
  // silently no-ops. The script is a static, owned string, so pinning its
  // SHA-256 hash in script-src is safe. If the script changes, update the
  // hash (compute with: `node -e "console.log(require('crypto').createHash('sha256').update(SCRIPT).digest('base64'))"`).
  scriptSrc.push("'sha256-4ThiPxQ6+66toyKaD+WyjhRJesNJPT53z2AYH4yEgtA='")

  // R1b — React 19's streaming runtime emits one timing bootstrap,
  // `requestAnimationFrame(function(){$RT=performance.now()});`, WITHOUT a
  // nonce (every other React/Next inline script gets one). The strict CSP
  // therefore refused it on every single page load, logging a
  // "Refused to execute inline script" error in every visitor's console and
  // firing a violation on every request for anyone collecting CSP reports.
  // It is a fixed, framework-owned literal, so pin its hash the same way as
  // R1. Verified against the served HTML, not copied from a doc.
  scriptSrc.push("'sha256-7mu4H06fwDCjmnxxr/xNHyuQC6pLTHr4M2E4jXw5WZs='")

  // R2 — React's development build uses `eval()` for stack-trace
  // reconstruction and HMR debugging aids. The strict CSP blocks it,
  // flooding the console with errors and breaking dev-only features.
  // Allow `'unsafe-eval'` in development only; production keeps the
  // strict policy (eval is not used in the optimised build). Checked as
  // `=== 'development'` (not `!== 'production'`) so the test environment
  // exercises the same strict policy that production ships with.
  if (process.env.NODE_ENV === 'development') {
    scriptSrc.push("'unsafe-eval'")
  }

  const styleSrc = ["'self'", "'unsafe-inline'"]
  const imgSrc = ["'self'", 'blob:', 'data:']
  const mediaSrc = ["'self'"]
  const connectSrc = ["'self'"]

  // Media can be served from two distinct hosts:
  // - S3_ENDPOINT: the storage API origin (presigned/private streaming).
  // - R2_PUBLIC_URL: the public serving domain (e.g. https://pub-xxx.r2.dev)
  //   that `generateFileURL` in src/plugins/index.ts stamps on public media
  //   URLs. It is a different origin than the endpoint, so it needs its own
  //   CSP entry — otherwise the browser blocks e.g. the hero logo, which is
  //   rendered `unoptimized` straight from that domain. Mirrors the
  //   remotePatterns handling in next.config.ts (R2_PUBLIC_URL is honored
  //   there without an S3_ENABLED gate, so do the same here).
  const candidateOrigins: Array<string | undefined> = []
  if (process.env.S3_ENABLED === 'true') {
    candidateOrigins.push(process.env.S3_ENDPOINT)
  }
  candidateOrigins.push(process.env.R2_PUBLIC_URL)

  for (const candidate of candidateOrigins) {
    if (!candidate) continue
    try {
      const origin = new URL(candidate).origin
      if (imgSrc.includes(origin)) continue
      imgSrc.push(origin)
      mediaSrc.push(origin)
      connectSrc.push(origin)
    } catch {
      // Invalid endpoint config should fail storage setup elsewhere.
    }
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    `media-src ${mediaSrc.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ]

  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

function applySecurityHeaders(response: NextResponse, csp?: string): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Payload Admin embeds public routes in a same-origin Live Preview iframe.
  // Keep the legacy header aligned with CSP `frame-ancestors 'self'`; `DENY`
  // would override that intended capability in supporting browsers.
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  if (csp) {
    response.headers.set('Content-Security-Policy', csp)
  }
}

function applyPreviewSecurityHeaders(response: NextResponse): void {
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
}

function isPreviewRequest(request: NextRequest): boolean {
  return (
    request.nextUrl.pathname === '/next/preview' ||
    request.nextUrl.pathname === '/next/exit-preview' ||
    request.nextUrl.searchParams.has('previewSession')
  )
}

function shouldSkip(pathname: string): boolean {
  return SKIP_PATTERNS.some((re) => re.test(pathname))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (shouldSkip(pathname)) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    return response
  }

  const nonce = createNonce()
  const csp = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  applySecurityHeaders(response, csp)
  if (isPreviewRequest(request)) applyPreviewSecurityHeaders(response)

  const existing = request.cookies.get(LANG_COOKIE)?.value
  if (isLocale(existing)) {
    return response
  }

  response.cookies.set(LANG_COOKIE, DEFAULT_LOCALE, {
    path: '/',
    maxAge: LANG_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  // Run on everything that isn't a static asset; the function itself filters
  // admin/api paths so we keep the matcher broad and explicit.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
