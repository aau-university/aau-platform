import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
export { PUBLISHED_WHERE, publishedRelation, publishedWithRelations } from '@/access/published'

/**
 * ARCHITECTURE DECISION: Lighter Helper Approach
 *
 * Instead of implementing heavy generic wrappers like `getPublishedDocs(collection)`
 * or `getActiveDocBySlug(collection, slug)`, we intentionally use a "lighter" approach:
 *
 * We provide `buildPublicQueryOptions` and `buildPublishedWhere` (etc) which are
 * used directly inside collection-specific loaders (e.g., `get-public-events.ts`).
 *
 * Why?
 * 1. Type Safety: Collection-specific loaders map Payload types (e.g., `Event`) to
 *    public view models (`PublicEventItem`) precisely. Generic wrappers make typing harder.
 * 2. Join Flexibility: Some loaders need to join images or related collections.
 * 3. Boilerplate reduction: `buildPublicQueryOptions` already centralizes the
 *    dangerous parts (overrideAccess: false, clamping limits, defaulting depth).
 */

// ── Limit helpers ──────────────────────────────────────────────────────────

export function clampCollectionLimit(limit?: number, fallback = 4, max = 8): number {
  return Math.max(1, Math.min(max, Math.trunc(limit ?? fallback)))
}

// ── Where builders ─────────────────────────────────────────────────────────

/**
 * The public visibility constraint for a collection with `versions.drafts`.
 *
 * Payload's `find` does not filter by `_status` on its own, so every public
 * loader has to apply this explicitly or unpublished drafts reach visitors.
 * It replaces two things:
 *
 *   - `buildPublishedWhere('isPublished')`, which filtered the hand-rolled
 *     boolean that Issue #34 removed from the editorial collections. It had no
 *     callers left, so a loader reaching for the obvious-sounding helper would
 *     have silently queried a column that no longer exists.
 *   - six identical `const PUBLISHED_WHERE = { _status: { equals: 'published' } }`
 *     declarations, one per loader, plus the same literal inline in a dozen
 *     more `where` clauses.
 */
/**
 * Returns a Where clause filtering on a boolean `isActive === true` field.
 *
 * Still correct for the deliberately non-editorial list collections —
 * `partners`, `sliders`, `team-members` — which have no draft workflow and
 * gate visibility on a plain checkbox. Do not reach for this on a collection
 * with `versions.drafts`; use `PUBLISHED_WHERE`.
 */
export function buildActiveWhere(fieldName = 'isActive'): Where {
  return {
    [fieldName]: { equals: true },
  }
}

// ── Query option builders ──────────────────────────────────────────────────

export interface BuildPublicQueryOptionsArgs {
  limit?: number
  locale?: Locale
  page?: number
  sort?: string
  depth?: number
  select?: Record<string, unknown>
}

/**
 * Returns a consistent set of Payload `find()` options for public reads.
 *
 * Defaults:
 * - depth: 0 (IDs only — prevent over-fetching)
 * - overrideAccess: false (collection access control enforced)
 * - locale: 'ar'
 * - limit: 4 when omitted; explicit limits are clamped 1–100
 */
/** Absolute ceiling for any public query, regardless of what a caller asks for. */
const HARD_LIMIT_CAP = 100

export function buildPublicQueryOptions(options: BuildPublicQueryOptionsArgs = {}) {
  // An EXPLICIT limit is the caller's intent and wins, bounded only by the
  // hard cap. The 8-item ceiling is a default for homepage blocks, not a
  // global truth: applying it to explicit limits silently truncated full
  // listing pages — `/faq` asked for 30
  // and rendered 8 of 13 FAQs with no pagination, so 5 were unreachable;
  // `/team` showed 8 of 24; the research index 8 of 100. Silent, no error.
  const limit =
    options.limit !== undefined && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(HARD_LIMIT_CAP, Math.trunc(options.limit)))
      : clampCollectionLimit()

  return {
    depth: options.depth ?? 0,
    limit,
    locale: options.locale ?? ('ar' as Locale),
    overrideAccess: false as const,
    ...(options.page !== undefined ? { page: options.page } : {}),
    ...(options.sort !== undefined ? { sort: options.sort } : {}),
    ...(options.select !== undefined ? { select: options.select } : {}),
  }
}
