import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Sliders revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('sliders')`
 * factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('sliders')

export const revalidateSliders: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
