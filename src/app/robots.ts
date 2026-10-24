import type { MetadataRoute } from 'next'

import { getServerSideURL } from '@/utilities/getURL'

/**
 * `robots.txt` generator (Next.js file-based metadata convention).
 *
 * Served at `/robots.txt` by Next.js. The route is env-aware via
 * `getServerSideURL()` — single source of truth is
 * `NEXT_PUBLIC_SERVER_URL` (VPS/Docker target; no `VERCEL_URL`).
 *
 * PR-026 will swap the hardcoded rules for values pulled from the
 * `analytics-settings` global (allowing editors to toggle indexing
 * without a redeploy). Until then, the rules below are the safe
 * defaults: allow everything except the Payload admin (`/admin`) and
 * the public REST API surface (`/api`).
 *
 * The `sitemap` field points crawlers at the sitemap index, which
 * itself lists the 4 per-collection sub-sitemaps (pages, news, events,
 * blog). See `src/app/(frontend)/(sitemaps)/sitemap-index.xml/route.ts`.
 */
export default function robots(): MetadataRoute.Robots {
  const url = getServerSideURL()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${url}/sitemap-index.xml`,
  }
}
