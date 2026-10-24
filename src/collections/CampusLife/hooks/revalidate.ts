import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * CampusLife revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('campus-life')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('campus-life')

export const revalidateCampusLife: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
