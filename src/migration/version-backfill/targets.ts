/**
 * The entities that received versioning in PR #25 and therefore have documents
 * older than their own version table.
 *
 * ── Why this is an explicit list and not "every versioned entity" ──────────
 * Pages and News were versioned from the start: the Neon archive carries their
 * `_pages_v` / `_news_v` rows and the 2026-09-14 staging diagnosis measured
 * complete `latest=true` coverage for both. Backfilling them would invent a
 * canonical initial version on top of a real history — losing nothing, but
 * claiming a version that never happened, and shifting what the Versions view
 * calls the document's first state.
 *
 * So the list is the set of entities whose version tables are EMPTY because
 * versioning was added after the content existed. `assertBackfillTargets`
 * checks it against the live config, so a slug that is renamed or loses its
 * versions configuration fails loudly rather than being skipped.
 */
export const BACKFILL_COLLECTIONS = [
  'colleges',
  'academic-departments',
  'academic-programs',
  'faculty-members',
  'study-plans',
] as const

export const BACKFILL_GLOBALS = [
  'site-settings',
  'about-page',
  'contact-settings',
  'navbar-settings',
  'footer-settings',
] as const

/**
 * Entities that must NEVER be backfilled because they already hold a real
 * version history. Named rather than merely omitted: "we did not think about
 * it" and "we decided against it" look identical in an omission, and this is
 * the difference the test asserts.
 */
export const BACKFILL_EXCLUDED_COLLECTIONS = ['pages', 'news'] as const

export type BackfillCollectionSlug = (typeof BACKFILL_COLLECTIONS)[number]
export type BackfillGlobalSlug = (typeof BACKFILL_GLOBALS)[number]
