import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Events revalidation hooks.
 *
 * Extracted from inline closures on `Events/index.ts`. Delegates to the
 * cross-cutting `revalidatePublicCollection('events')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('events')

export const revalidateEvent: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
