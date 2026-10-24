import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * FacultyMembers revalidation hooks.
 *
 * Extracted from inline closures on `FacultyMembers/index.ts`. Delegates to
 * the cross-cutting `revalidatePublicCollection('faculty-members')`
 * factory which:
 *   - busts `payload:public` + `payload:collection:faculty-members` +
 *     `faculty-members-sitemap` tags,
 *   - busts the page-specific `payload:page:<slug>` tag,
 *   - revalidates the previous slug's URL on slug rename (`/faculty/<old-slug>`),
 *   - short-circuits when `context.disableRevalidate` is set.
 * Public paths come from the shared collection route registry.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('faculty-members')

export const revalidateFacultyMember: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
