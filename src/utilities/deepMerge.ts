/**
 * Deep-merge utility re-export.
 *
 * The implementation lives in `src/fields/deepMerge.ts` (PR-005) because the
 * primary consumers are field factories. This re-export exposes it from
 * `src/utilities/` for general-purpose use, matching the official Payload
 * template layout.
 */
export { deepMerge } from '../fields/deepMerge'
export { default } from '../fields/deepMerge'
