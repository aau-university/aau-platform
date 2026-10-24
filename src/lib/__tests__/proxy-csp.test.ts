import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { proxy } from '@/proxy'

describe('proxy Content-Security-Policy', () => {
  it('prevents Preview URLs from leaking authority through referrers or caches', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/about?previewSession=opaque-token'),
    )

    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive')
  })

  it('keeps the standard referrer policy on public URLs', () => {
    const response = proxy(new NextRequest('http://localhost:3000/about'))

    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('X-Robots-Tag')).toBeNull()
  })

  it('allows same-origin framing for Payload Live Preview only', () => {
    const response = proxy(new NextRequest('http://localhost:3000/'))
    const csp = response.headers.get('Content-Security-Policy') ?? ''

    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).not.toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('frame-ancestors *')
  })

  it('wires the per-request nonce into script-src [Issue #9]', () => {
    const response = proxy(new NextRequest('http://localhost:3000/'))
    const csp = response.headers.get('Content-Security-Policy') ?? ''

    // script-src must use the nonce and must NOT carry the dangerous
    // 'unsafe-inline' / 'unsafe-eval' fallbacks.
    expect(csp).toMatch(/script-src 'self' 'nonce-[a-f0-9]{32}'/)
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toMatch(/(?!.*script-src[^;]*'unsafe-inline')/)
  })

  // Two inline scripts cannot carry the per-request nonce, so both are
  // pinned by hash. Each is recomputed from its real source below rather
  // than asserted as a literal — a literal would only prove that proxy.ts
  // contains the string proxy.ts defines, which can never fail.
  //
  // Paths are resolved from `import.meta.url`, not `process.cwd()`, so the
  // tests hold under any runner/root combination.
  it('keeps the pinned locale-script hash in sync with the script it guards', async () => {
    // If LOCALE_INIT_SCRIPT is edited without recomputing the hash, the
    // browser silently blocks it and the RTL flash returns.
    const { createHash } = await import('node:crypto')
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const path = await import('node:path')

    const here = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(
      path.join(here, '..', '..', 'app', '(frontend)', 'layout.tsx'),
      'utf8',
    )
    const match = source.match(/const LOCALE_INIT_SCRIPT = `([\s\S]*?)`/)
    expect(match).not.toBeNull()

    const digest = createHash('sha256').update(match![1], 'utf8').digest('base64')
    const response = proxy(new NextRequest('http://localhost:3000/'))
    expect(response.headers.get('Content-Security-Policy') ?? '').toContain(
      `'sha256-${digest}'`,
    )
  })

  it("keeps the pinned hash for React's streaming script in sync with react-dom", async () => {
    // React emits `shellTimeRuntimeScript` without a nonce. It is not a
    // stable API — it first appeared in React 19.2 — so an upgrade can
    // change the literal and silently reintroduce a CSP violation on every
    // page load. Recompute from the installed react-dom so the upgrade
    // fails here instead of in production.
    const { createHash } = await import('node:crypto')
    const { readFileSync } = await import('node:fs')
    const { createRequire } = await import('node:module')
    const path = await import('node:path')

    // `react-dom/package.json` does not export the cjs subpath, so resolve
    // the package root and walk to the file directly.
    const require = createRequire(import.meta.url)
    const reactDomRoot = path.dirname(require.resolve('react-dom/package.json'))
    const source = readFileSync(
      path.join(reactDomRoot, 'cjs', 'react-dom-server.edge.production.js'),
      'utf8',
    )

    const match = source.match(/shellTimeRuntimeScript\s*=\s*stringToPrecomputedChunk\(\s*"((?:[^"\\]|\\.)*)"/)
    expect(
      match,
      'react-dom no longer exposes shellTimeRuntimeScript in the expected shape — re-derive the CSP hash from the served HTML',
    ).not.toBeNull()

    const script = JSON.parse(`"${match![1]}"`) as string
    const digest = createHash('sha256').update(script, 'utf8').digest('base64')
    const response = proxy(new NextRequest('http://localhost:3000/'))
    expect(response.headers.get('Content-Security-Policy') ?? '').toContain(
      `'sha256-${digest}'`,
    )
  })

  it('keeps unsafe-inline for style-src (Next.js limitation) [Issue #9]', () => {
    const response = proxy(new NextRequest('http://localhost:3000/'))
    const csp = response.headers.get('Content-Security-Policy') ?? ''

    // style-src keeps 'unsafe-inline' because Next.js does not yet
    // propagate the nonce to all generated <style> tags.
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('propagates the nonce via the x-nonce request header [Issue #9]', () => {
    const response = proxy(new NextRequest('http://localhost:3000/'))
    const csp = response.headers.get('Content-Security-Policy') ?? ''
    // The nonce in CSP should match the one in the request headers that
    // Next.js reads to inject into framework-generated inline scripts.
    const cspNonceMatch = csp.match(/'nonce-([a-f0-9]{32})'/)
    expect(cspNonceMatch).not.toBeNull()
    const cspNonce = cspNonceMatch?.[1]
    expect(cspNonce).toBeTruthy()
    // NextResponse.next({ request: { headers } }) exposes the mutated
    // request headers via the `x-middleware-request-*` response headers
    // (Next.js internal protocol). Assert the nonce is propagated.
    const requestNonceHeader =
      response.headers.get('x-middleware-request-x-nonce') ??
      response.headers.get('x-middleware-headers') ??
      ''
    expect(requestNonceHeader).toContain(cspNonce)
  })
})

describe('proxy CSP media origins (R2 / S3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function cspFor() {
    const response = proxy(new NextRequest('http://localhost:3000/'))
    return response.headers.get('Content-Security-Policy') ?? ''
  }

  function directive(csp: string, name: string): string {
    return csp.split(';').find((d) => d.trim().startsWith(`${name} `)) ?? ''
  }

  it('allows the R2 public serving domain in img-src, media-src, and connect-src', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

    const csp = cspFor()
    expect(directive(csp, 'img-src')).toContain('https://pub-abc123.r2.dev')
    expect(directive(csp, 'media-src')).toContain('https://pub-abc123.r2.dev')
    expect(directive(csp, 'connect-src')).toContain('https://pub-abc123.r2.dev')
  })

  it('normalizes R2_PUBLIC_URL to its origin (trailing slash / path stripped)', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev/media/')

    const csp = cspFor()
    expect(directive(csp, 'img-src')).toContain('https://pub-abc123.r2.dev')
    expect(directive(csp, 'img-src')).not.toContain('https://pub-abc123.r2.dev/media')
  })

  it('allows both the S3 endpoint and the R2 public domain when both are set', () => {
    vi.stubEnv('S3_ENABLED', 'true')
    vi.stubEnv('S3_ENDPOINT', 'https://account.r2.cloudflarestorage.com')
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

    const imgSrc = directive(cspFor(), 'img-src')
    expect(imgSrc).toContain('https://account.r2.cloudflarestorage.com')
    expect(imgSrc).toContain('https://pub-abc123.r2.dev')
  })

  it('honors R2_PUBLIC_URL even when S3_ENABLED is not true (matches next.config.ts)', () => {
    vi.stubEnv('S3_ENABLED', 'false')
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

    expect(directive(cspFor(), 'img-src')).toContain('https://pub-abc123.r2.dev')
  })

  it('deduplicates when the endpoint and public URL share an origin', () => {
    vi.stubEnv('S3_ENABLED', 'true')
    vi.stubEnv('S3_ENDPOINT', 'https://pub-abc123.r2.dev')
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

    const imgSrc = directive(cspFor(), 'img-src')
    expect(imgSrc.split('https://pub-abc123.r2.dev').length - 1).toBe(1)
  })

  it('ignores an invalid R2_PUBLIC_URL without breaking the policy', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'not-a-url')

    const csp = cspFor()
    expect(directive(csp, 'img-src')).toContain("'self'")
    expect(csp).not.toContain('not-a-url')
  })

  it('keeps the strict default policy when no storage env is configured', () => {
    vi.stubEnv('S3_ENABLED', '')
    vi.stubEnv('S3_ENDPOINT', '')
    vi.stubEnv('R2_PUBLIC_URL', '')

    const csp = cspFor()
    expect(directive(csp, 'img-src').trim()).toBe("img-src 'self' blob: data:")
    expect(directive(csp, 'connect-src').trim()).toBe("connect-src 'self'")
  })
})
