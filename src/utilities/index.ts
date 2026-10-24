/**
 * Generic, framework-agnostic helpers ported (with AAU adaptations) from the
 * official Payload website template. AAU-specific business logic lives in
 * `src/lib/` — keep this folder for pure helpers that routes, blocks, and
 * metadata generators reach for without thinking.
 *
 * @see {@link ./README.md} for the convention.
 */

export * from './canUseDOM'
export * from './deepMerge'
export * from './formatAuthors'
export * from './formatDateTime'
export * from './formatDateTimeSync'
export * from './generateMeta'
export * from './generatePreviewPath'
export * from './getCachedRedirects'
export * from './getDocument'
export * from './getGlobals'
export * from './getMeUser'
export * from './getMediaUrl'
export * from './getURL'
export * from './mergeOpenGraph'
export * from './toKebabCase'
