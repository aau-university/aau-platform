import { getServerSideURL } from '@/utilities/getURL'

/**
 * `sitemap-index.xml` — sitemap index listing the 4 per-collection
 * sub-sitemaps.
 *
 * - Revalidates every 1 hour (`revalidate = 3600`).
 * - Lists: pages-sitemap.xml, news-sitemap.xml, events-sitemap.xml,
 *   blog-sitemap.xml.
 * - Referenced from `src/app/robots.ts` as the canonical sitemap entry
 *   point.
 *
 * The index does NOT need to query the database — it is a static list
 * of sub-sitemap URLs. We still revalidate every hour so search engines
 * see fresh `<lastmod>` values if a sub-sitemap disappears (e.g. if a
 * collection is later removed).
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(): Promise<Response> {
  const base = getServerSideURL()

  const subSitemaps = [
    'pages-sitemap.xml',
    'news-sitemap.xml',
    'events-sitemap.xml',
    'blog-sitemap.xml',
  ]

  const entries = subSitemaps
    .map((name) => {
      const loc = `${base}/${name}`
      return `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
