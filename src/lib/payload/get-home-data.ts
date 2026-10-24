/**
 * Shared section-text types for homepage/section components.
 *
 * The legacy `getHomeData()` aggregate loader that used to live here was
 * dead code (no runtime callers — the homepage loads its document via
 * `getPublicPageBySlug` from `get-public-page` and renders through
 * `RenderBlocks` + per-block loaders) and it was the last consumer of the
 * removed hardcoded demo data (fake stats/colleges/news). Only the types
 * that section components import survive.
 */

export interface HomeHeroContent {
  badge?: string
  titlePrimary?: string
  titleSecondary?: string
  description?: string
}

export interface HomeSectionText {
  title?: string | null
  description?: string | null
}
