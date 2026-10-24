import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Partners revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('partners')`
 * factory. Partners have no public detail route, so only shared cache tags
 * are invalidated.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('partners')

export const revalidatePartners: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
