import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Colleges revalidation hooks.
 *
 * Extracted from inline closures on `Colleges/index.ts`. Delegates to the
 * cross-cutting `revalidatePublicCollection('colleges')` factory which:
 *   - busts `payload:public` + `payload:collection:colleges` + `colleges-sitemap` tags,
 *   - busts the page-specific `payload:page:<slug>` tag,
 *   - revalidates the previous slug's URL on slug rename,
 *   - short-circuits when `context.disableRevalidate` is set.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('colleges')

export const revalidateCollege: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
