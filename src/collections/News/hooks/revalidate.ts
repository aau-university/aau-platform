import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * News revalidation hooks.
 *
 * Extracted from inline closures on `News/index.ts`. Delegates to the
 * cross-cutting `revalidatePublicCollection('news')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('news')

export const revalidateNews: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
