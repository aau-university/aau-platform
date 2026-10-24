import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * FAQs revalidation hooks.
 *
 * Extracted from inline closures on `FAQs/index.ts`. Delegates to the
 * cross-cutting `revalidatePublicCollection('faqs')` factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('faqs')

export const revalidateFAQ: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
