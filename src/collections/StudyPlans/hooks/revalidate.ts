import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * StudyPlans revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('study-plans')`
 * factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('study-plans')

export const revalidateStudyPlan: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
