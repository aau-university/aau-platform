import type { CollectionConfig, GlobalConfig } from 'payload'

/**
 * Single source of truth for Payload's versioning / draft policy.
 *
 * All editorial collections consume this policy so draft behavior cannot
 * drift between collection configs. A 400ms debounce keeps Live Preview
 * responsive while limiting write and version-row churn.
 *
 * Scheduled publishing stays disabled until a dedicated Payload jobs worker
 * is designed for the future VPS/Docker deployment.
 */

/**
 * `CollectionConfig['versions']` and `GlobalConfig['versions']` both accept a
 * bare `true` alongside the options object. The factories always return the
 * object form, and saying so lets callers and tests read `.drafts` /
 * `.maxPerDoc` without re-narrowing a union that can never be a boolean here.
 */
type CollectionVersionsConfig = Exclude<NonNullable<CollectionConfig['versions']>, boolean>
type GlobalVersionsConfig = Exclude<NonNullable<GlobalConfig['versions']>, boolean>

/** Shared debounce for every editorial collection. */
const EDITORIAL_AUTOSAVE_INTERVAL_MS = 400

/** Version rows retained per document (Payload's own default is 100). */
const MAX_VERSIONS_PER_DOC = 50

/** Version rows retained per global. Globals are singletons edited rarely. */
const MAX_VERSIONS_PER_GLOBAL = 25

export interface EditorialVersionsOptions {
  /**
   * Override the retained version count. Use for collections whose documents
   * are edited far more often than the rest.
   */
  maxPerDoc?: number
}

/**
 * Draft/publish workflow for editorial collections: Payload's `_status`
 * field, full version history, and autosave.
 */
export function editorialVersions(
  options: EditorialVersionsOptions = {},
): CollectionVersionsConfig {
  const { maxPerDoc = MAX_VERSIONS_PER_DOC } = options

  return {
    drafts: {
      autosave: {
        interval: EDITORIAL_AUTOSAVE_INTERVAL_MS,
      },
      schedulePublish: false,
    },
    maxPerDoc,
  }
}

/**
 * Version history WITHOUT a draft workflow — an audit log with rollback.
 *
 * For globals holding real content or site-wide configuration: there is no
 * "unpublished settings" concept to model, but an edit that blanks a section
 * or points navigation at the wrong URL must be recoverable. Adds no
 * `_status` field, so it changes no read path and no public query.
 *
 * Note globals key the retention limit as `max`, not `maxPerDoc`
 * (`IncomingGlobalVersions` in `payload/dist/versions/types.d.ts`).
 */
export function auditVersions(max: number = MAX_VERSIONS_PER_GLOBAL): GlobalVersionsConfig {
  return { max }
}

export const VERSION_POLICY = {
  EDITORIAL_AUTOSAVE_INTERVAL_MS,
  MAX_VERSIONS_PER_DOC,
  MAX_VERSIONS_PER_GLOBAL,
} as const
