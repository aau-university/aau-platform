import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePublicCollection } from '@/hooks/revalidatePublicCache'

/**
 * AcademicDepartments revalidation hooks.
 *
 * Extracted from inline closures on `AcademicDepartments/index.ts`. Delegates
 * to the cross-cutting `revalidatePublicCollection('academic-departments')`
 * factory which:
 *   - busts `payload:public` + `payload:collection:academic-departments` +
 *     `academic-departments-sitemap` tags,
 *   - revalidates the previous slug's URL on slug rename,
 *   - short-circuits when `context.disableRevalidate` is set.
 *
 * BUGFIX (PR-012 §4): prior to this PR, `AcademicDepartments` had NO
 * revalidation hook, so editing a department left stale cached pages. The
 * `afterChange` + `afterDelete` hooks below close that gap.
 */
const { afterChange, afterDelete } = revalidatePublicCollection('academic-departments')

export const revalidateDepartment: CollectionAfterChangeHook = afterChange
export const revalidateDelete: CollectionAfterDeleteHook = afterDelete
