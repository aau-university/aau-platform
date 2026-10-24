import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Announcements revalidation hooks.
 *
 * Delegates to the cross-cutting
 * `revalidatePublicCollection('announcements')` factory.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('announcements')

export const revalidateAnnouncements: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
