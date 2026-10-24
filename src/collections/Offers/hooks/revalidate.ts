import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Offers revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('offers')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('offers')

export const revalidateOffers: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
