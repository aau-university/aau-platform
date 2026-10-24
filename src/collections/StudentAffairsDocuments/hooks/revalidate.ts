import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * StudentAffairsDocuments revalidation hooks.
 *
 * Delegates to the cross-cutting
 * `revalidatePublicCollection('student-affairs-documents')` factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('student-affairs-documents')

export const revalidateStudentAffairsDocuments: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
