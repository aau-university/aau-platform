export const PUBLIC_CACHE_TAG = 'payload:public'
export const REDIRECTS_CACHE_TAG = 'payload:redirects'

export function collectionCacheTag(slug: string): string {
  return `payload:collection:${slug}`
}

export function globalCacheTag(slug: string): string {
  return `payload:global:${slug}`
}

export function pageCacheTag(slug: string): string {
  return `payload:page:${slug}`
}

export function sitemapCacheTag(collection: string): string {
  return `${collection}-sitemap`
}
