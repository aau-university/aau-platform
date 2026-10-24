import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Categories revalidation hooks.
 *
 * Delegates to the cross-cutting `revalidatePublicCollection('categories')`
 * factory which:
 *   - busts `payload:public` + `payload:collection:categories` + `categories-sitemap` tags,
 *   - busts the page-specific `payload:page:<slug>` tag (if applicable),
 *   - short-circuits when `context.disableRevalidate` is set.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('categories')

export const revalidateCategories: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
