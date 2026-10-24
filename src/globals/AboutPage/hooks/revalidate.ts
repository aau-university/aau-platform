import type { GlobalAfterChangeHook } from 'payload'

import { globalCacheTag } from '@/lib/payload/cache-tag-names'

/**
 * Invalidate the public AboutPage cache whenever the global is saved.
 *
 * The loader (`getPublicAboutPage`) tags its `'use cache'` entry with
 * `globalCacheTag('about-page')` (= `'payload:global:about-page'`). The
 * previous implementation revalidated the bare string `'global:about-page'`,
 * which never matched — so edits to the AboutPage global were invisible on
 * the public site until the cache entry expired on its own.
 *
 * Use the same `globalCacheTag()` helper the loader uses so producer and
 * consumer always agree on the tag string.
 *
 * Mirrors `revalidatePublicGlobal`'s safety contract: honors
 * `context.disableRevalidate` (seeders/importers/migrations run outside a
 * request scope) and never lets a revalidation failure abort the write —
 * `revalidateTag` throws "static generation store missing" when called
 * outside a request, which previously crashed the seed mid-run.
 */
export const revalidateAboutPage: GlobalAfterChangeHook = async ({ context }) => {
  if (context?.disableRevalidate) return
  try {
    const { revalidateTag } = await import('next/cache')
    revalidateTag(globalCacheTag('about-page'), 'max')
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[revalidateAboutPage] Failed to revalidate cache tag.', err)
    }
  }
}
