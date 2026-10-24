import type { Locale } from '@/i18n/locale'
import type { AboutPage } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { applyPublicCacheTags, globalCacheTag } from './cache-tags'

/**
 * Get the AboutPage global for public display.
 *
 * Migrated to the unified public-loader pattern:
 *   - `'use cache'` directive (replaces deprecated `unstable_cache`)
 *   - `getPayloadSafe()` instead of raw `getPayload()` so a missing
 *     `PAYLOAD_SECRET` or unreachable DB does not crash `/about` in dev
 *   - `applyPublicCacheTags(globalCacheTag('about-page'))` so the
 *     `revalidateAboutPage` hook can invalidate the entry by tag
 *   - `try/catch` + `rethrowPayloadErrorInProduction` so production
 *     outages surface (health checks, error boundaries) while dev/test
 *     gracefully returns `null` for the caller to render a fallback
 *
 * Returns `null` when Payload is unavailable or the global fetch throws
 * in dev/test. Callers must handle the `null` case (render skeleton /
 * empty state). In production the error is re-thrown after the catch
 * so it propagates to the route error boundary.
 */
export async function getPublicAboutPage(
  opts: { locale: Locale },
): Promise<AboutPage | null> {
  'use cache'

  applyPublicCacheTags(globalCacheTag('about-page'))

  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    return await payload.findGlobal({
      slug: 'about-page',
      depth: 2,
      locale: opts.locale,
      overrideAccess: false,
    })
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
