import type { SitemapEntry } from '@/lib/payload/sitemap-data'

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function renderSitemapXml(
  entries: SitemapEntry[],
  baseUrl: string,
): string {
  const base = baseUrl.replace(/\/$/, '')
  const urls = entries
    .map(({ lastModified, path }) => {
      const loc = escapeXml(`${base}${path}`)
      const lastmod = lastModified
        ? `\n    <lastmod>${escapeXml(lastModified)}</lastmod>`
        : ''
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export function sitemapResponse(body: string): Response {
  return new Response(body, {
    headers: {
      // The `'use cache'` data scope is the single freshness authority.
      // Intermediaries must revalidate the XML response instead of retaining
      // an independent stale-while-revalidate copy after a CMS mutation.
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
