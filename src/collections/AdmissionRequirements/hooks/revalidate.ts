import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * AdmissionRequirements revalidation hooks.
 *
 * Delegates to the cross-cutting
 * `revalidatePublicCollection('admission-requirements')` factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('admission-requirements')

export const revalidateAdmissionRequirements: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
