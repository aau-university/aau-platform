import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { AcademicProgram } from '@/payload-types'

import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { buildPublicQueryOptions, publishedWithRelations } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

// ── Types ────────────────────────────────────────────────────────

export type PublicProgramDegreeType = 'diploma' | 'bachelor' | 'master' | 'phd' | null

export interface PublicProgramItem {
  id: string
  name: string
  slug: string
  description: string
  degreeType: PublicProgramDegreeType
  studyYears: string
  admissionRate: number | null
  duration: string
  highSchoolType: string
  image: string | null
  collegeId: string | null
  collegeName: string | null
  collegeSlug: string | null
  departmentId: string | null
  departmentName: string | null
}

export interface GetPublicProgramsOptions {
  limit?: number
  locale?: Locale
  /** Filter by a specific college ID. */
  collegeId?: string | number | null
  /** Filter by degree type. */
  degreeType?: PublicProgramDegreeType
  readContext?: ContentReadContext
}

// ── Helpers ──────────────────────────────────────────────────────

function mapDegreeType(value: AcademicProgram['degreeType']): PublicProgramDegreeType {
  if (value === 'diploma' || value === 'bachelor' || value === 'master' || value === 'phd') {
    return value
  }
  return null
}

function mapListItem(doc: AcademicProgram): PublicProgramItem {
  // `college` and `department` are relationships. With depth:1 they come back
  // as populated objects ({ id, name, slug, ... }) rather than bare IDs.
  const college = doc.college
  const collegeObj =
    college && typeof college === 'object' && 'id' in college
      ? (college as { id?: string | number; name?: string; slug?: string })
      : null

  const department = doc.department
  const departmentObj =
    department && typeof department === 'object' && 'id' in department
      ? (department as { id?: string | number; name?: string })
      : null

  return {
    id: String(doc.id ?? ''),
    name: typeof doc.name === 'string' ? doc.name : '',
    slug: doc.slug || String(doc.id ?? ''),
    description: richTextToPlainText(doc.description),
    degreeType: mapDegreeType(doc.degreeType),
    studyYears: typeof doc.studyYears === 'string' ? doc.studyYears : '',
    admissionRate: typeof doc.admissionRate === 'number' ? doc.admissionRate : null,
    duration: typeof doc.duration === 'string' ? doc.duration : '',
    highSchoolType: typeof doc.highSchoolType === 'string' ? doc.highSchoolType : '',
    image: resolveMediaUrl(doc.image) ?? null,
    collegeId: collegeObj ? String(collegeObj.id ?? '') : null,
    collegeName: collegeObj?.name ?? null,
    collegeSlug: collegeObj?.slug ?? null,
    departmentId: departmentObj ? String(departmentObj.id ?? '') : null,
    departmentName: departmentObj?.name ?? null,
  }
}

// ── Loader ───────────────────────────────────────────────────────

/**
 * Fetch public academic programs across all colleges (or filtered by college
 * / degree type). Used by the `programsGrid` homepage block.
 *
 * AcademicPrograms now uses Payload's `versions.drafts`, so the publishing
 * filter is `_status: 'published'` (via the shared `PUBLISHED_WHERE`). It
 * previously gated on a hand-rolled `isActive` checkbox with no version
 * history and no preview.
 */
export async function getPublicPrograms(
  options: GetPublicProgramsOptions = {},
): Promise<PublicProgramItem[]> {
  if (options.readContext?.draft) return queryProgramItems(options)
  return getPublishedProgramItems({
    collegeId: options.collegeId,
    degreeType: options.degreeType,
    limit: options.limit,
    locale: options.locale,
  })
}

async function getPublishedProgramItems(options: Omit<GetPublicProgramsOptions, 'readContext'>): Promise<PublicProgramItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('academic-programs'))
  return queryProgramItems(options)
}

async function queryProgramItems(options: GetPublicProgramsOptions): Promise<PublicProgramItem[]> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return []

    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: 'name',
      depth: 1,
    })

    const clauses: Where[] = options.readContext?.draft ? [] : [publishedWithRelations('college')]
    if (options.collegeId != null && options.collegeId !== '') {
      clauses.push({ college: { equals: options.collegeId } })
    }
    if (options.degreeType) {
      clauses.push({ degreeType: { equals: options.degreeType } })
    }
    const where: Where | undefined = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { and: clauses }

    const result = await payload.find({
      collection: 'academic-programs',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: AcademicProgram) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

// ── Batched program options ──────────────────────────────────────

export interface ProgramOption {
  id: number
  slug: string
  name: string
}

/**
 * Fetch active program options for MANY colleges in one query, grouped by
 * college id.
 *
 * Replaces the admission / email-request N+1 pattern (one
 * `getCollegePrograms(slug)` call — itself two queries — per college) with a
 * single `college in [ids]` fetch: 2×N queries → 1. `select` narrows the
 * transferred row to the four fields the option lists need.
 *
 * Returns a plain `Record` keyed by stringified college id so the value is
 * serializable for `'use cache'`.
 */
export async function getProgramOptionsByColleges(
  collegeIds: Array<number | string>,
  locale?: Locale,
): Promise<Record<string, ProgramOption[]>> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('academic-programs'))

  const ids = collegeIds
    .map((id) => (typeof id === 'number' ? id : Number(id)))
    .filter((id) => Number.isFinite(id) && id > 0)
  if (ids.length === 0) return {}

  try {
    const payload = await getPayloadSafe()
    if (!payload) return {}

    const result = await payload.find({
      collection: 'academic-programs',
      where: {
        and: [{ college: { in: ids } }, publishedWithRelations('college')],
      },
      depth: 0,
      limit: 0,
      locale: locale ?? 'ar',
      overrideAccess: false,
      select: { slug: true, name: true, college: true, displayOrder: true },
      sort: 'displayOrder',
    })

    const grouped: Record<string, ProgramOption[]> = {}
    for (const doc of result.docs as AcademicProgram[]) {
      const college = doc.college
      const collegeId =
        typeof college === 'number' || typeof college === 'string'
          ? String(college)
          : college && typeof college === 'object' && 'id' in college
            ? String((college as { id: number | string }).id)
            : null
      if (!collegeId || typeof doc.id !== 'number') continue
      ;(grouped[collegeId] ??= []).push({
        id: doc.id,
        slug: doc.slug || String(doc.id),
        name: typeof doc.name === 'string' ? doc.name : '',
      })
    }
    return grouped
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return {}
  }
}
