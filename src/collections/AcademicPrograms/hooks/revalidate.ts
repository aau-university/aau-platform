import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * AcademicPrograms revalidation hooks.
 *
 * Extracted from inline closures on `AcademicPrograms/index.ts`. Delegates to
 * the cross-cutting `revalidatePublicCollection('academic-programs')`
 * factory which:
 *   - busts `payload:public` + `payload:collection:academic-programs` +
 *     `academic-programs-sitemap` tags,
 *   - busts the page-specific `payload:page:<slug>` tag,
 *   - short-circuits when `context.disableRevalidate` is set.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('academic-programs')

export const revalidateProgram: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
