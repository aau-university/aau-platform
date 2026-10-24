import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * Pages revalidation hooks.
 *
 * Extracted from inline closures on `Pages/index.ts` so the collection
 * config stays a thin shape declaration while cache-side-effect logic
 * lives next to it under `hooks/`. Delegates to the cross-cutting
 * `revalidatePublicCollection('pages')` factory which:
 *   - busts `payload:public` + `payload:collection:pages` + `pages-sitemap` tags,
 *   - busts the page-specific `payload:page:<slug>` tag,
 *   - revalidates the previous slug's URL on slug rename,
 *   - short-circuits when `context.disableRevalidate` is set.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('pages')

export const revalidatePage: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
