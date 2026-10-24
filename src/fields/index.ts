/**
 * Barrel for the field-factories layer.
 *
 * Convention: one factory per file. Add a new field factory by creating
 * `src/fields/<name>.ts` that exports a single named function/constant,
 * then re-export it from this barrel with `export * from './<name>'`.
 *
 * External consumers (collections, globals, blocks, hooks) MUST import from
 * this barrel:
 *
 *   import { link, linkGroup, media, slug } from '@/fields'
 *
 * Internal cross-file dependencies inside `src/fields/` MUST use direct
 * relative imports (e.g. `import { deepMerge } from './deepMerge'`) to avoid
 * circular-import problems — the barrel is for external consumers only.
 *
 * ## PR-005 scope
 *
 * - `localized`, `localizedText`, `localizedTextarea`, `localizedRichText`
 *   are AAU's localization factories (single-field, `localized: true` — no
 *   `*Ar`/`*En` duplicates). PR-005 fixed the options type from `Pick<>` to
 *   `Omit<>` to future-proof against Payload adding new field options.
 *
 * - `link`, `linkGroup`, `defaultLexical`, `slug`, `media`, `block` are
 *   ported from the official Payload template's `fields/` directory, adapted
 *   to AAU's collection set (`pages`/`blog-posts`/`media`) and Arabic RTL
 *   admin defaults. Not wired to any consumer in this PR — PR-007 (blocks),
 *   PR-010/011 (collections), and PR-026 (globals) will adopt them.
 *
 * - `deepMerge` is a generic deep-merge utility consumed by every factory's
 *   `overrides` parameter. Lives in `fields/` because its primary consumers
 *   are field factories; PR-006 re-exports it from `utilities/` for general
 *   use.
 *
 * - `slug` wraps Payload's `slugField()` helper with AAU's Arabic-aware
 *   transliteration (`src/hooks/generateSlug.ts#slugify`). The legacy
 *   beforeValidate hook remains active until PR-011 migrates callers; this
 *   factory is added in isolation so the swap can happen without a flag day.
 */

export * from './localized'
export * from './deepMerge'
export * from './link'
export * from './linkGroup'
export * from './defaultLexical'
export * from './slug'
export * from './media'
export * from './block'
