import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Centers revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('centers')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('centers')

export const revalidateCenters: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
