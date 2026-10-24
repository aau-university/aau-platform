import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * BlogPosts revalidation hooks.
 *
 * Extracted from inline closures on `BlogPosts/index.ts`. Delegates to the
 * cross-cutting `revalidatePublicCollection('blog-posts')`
 * factory. Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('blog-posts')

export const revalidateBlogPost: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
