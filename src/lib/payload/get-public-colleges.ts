import type { HomeFallbackCollege } from '@/lib/fallback/home-fallback-data'
import type { Locale } from '@/i18n/locale'
import type {
  AcademicDepartment,
  AcademicProgram,
  College,
  Event,
  FacultyMember,
  News,
  User,
} from '@/payload-types'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'
import type { Payload, Where } from 'payload'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { PUBLISHED_WHERE, buildPublicQueryOptions, publishedWithRelations } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import type { ContentReadContext } from './content-read-context'

/**
 * Extract a single relationship ID from a value that may be a raw ID
 * (`string` | `number`) or a populated Payload doc (`{ id, ... }`).
 *
 * With `depth: 0`, relationship fields are returned as raw IDs; with
 * `depth ≥ 1`, they are populated objects. This helper normalises both
 * shapes so callers do not need to branch.
 */
function extractRelationId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return null
}

function relationshipIds(values: unknown): Array<string | number> {
  if (!Array.isArray(values)) return []
  return values.flatMap((value) => {
    const id = extractRelationId(value)
    return id !== null ? [id] : []
  })
}

/**
 * Build per-college counts for `academic-programs` and `faculty-members` in a
 * **single batched round-trip per collection** instead of one `count` query
 * per college (Issue #45 — eliminates the N+1 pattern: 8 colleges × 2
 * collections = 16 round-trips → 2 round-trips).
 *
 * Approach: issue one `payload.find` per related collection with
 * `where: { college: { in: collegeIds } }`, `limit: 0` (unlimited — fetch all
 * matching rows), `depth: 0` (relationships as raw IDs), and
 * `select: { college: true }` (only the `college` field is needed for
 * grouping). Then group the returned docs client-side into a
 * `Map<collegeId, count>`.
 *
 * `select` keeps the transferred payload to just `{ id, college }` per doc,
 * so even with hundreds of programs/faculty the cost is negligible.
 */
async function buildCollegeCounts(
  payload: Payload,
  collegeIds: Array<string | number>,
  options: { draft?: boolean; user?: User } = {},
): Promise<{
  programs: Map<string, number>
  faculty: Map<string, number>
}> {
  if (collegeIds.length === 0) {
    return { programs: new Map(), faculty: new Map() }
  }

  const draft = options.draft ?? false
  const countsWhere = {
    and: [{ college: { in: collegeIds } }, ...(draft ? [] : [publishedWithRelations('college')])],
  }

  const [programsResult, facultyResult] = await Promise.all([
    payload.find({
      collection: 'academic-programs',
      where: countsWhere,
      limit: 0,
      depth: 0,
      select: { college: true },
      overrideAccess: false,
      draft,
      ...(draft && options.user ? { user: options.user } : {}),
    }),
    payload.find({
      collection: 'faculty-members',
      where: countsWhere,
      limit: 0,
      depth: 0,
      select: { college: true },
      overrideAccess: false,
      draft,
      ...(draft && options.user ? { user: options.user } : {}),
    }),
  ])

  return {
    programs: countByCollege(programsResult.docs),
    faculty: countByCollege(facultyResult.docs),
  }
}

function countByCollege(docs: unknown[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const doc of docs) {
    const collegeId = extractRelationId((doc as { college?: unknown }).college)
    if (collegeId !== null) {
      const key = String(collegeId)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return map
}

export interface GetPublicCollegesOptions {
  limit?: number
  locale?: Locale
  selectedColleges?: unknown
  readContext?: ContentReadContext
}

export interface PublicCollegeDetail {
  id: string
  slug: string
  name: string
  description?: College['description']
  admissionRequirements?: College['description']
  vision?: College['description']
  mission?: College['description']
  goals?: College['description']
  values?: College['description']
  strategy?: College['description']
  quality?: College['description']
  icon?: string | null
  image?: string | null
  deanName?: string
  deanImage?: string | null
  programsCount: number
  facultyCount: number
  departmentsCount: number
  meta?: College['meta']
}

export interface PublicCollegeProgramItem {
  id: string
  slug: string
  name: string
  description: string
  objectives: string
  careerProspects: string
  applicationSteps: string
  whyProgram: string
  highSchoolType: string
  duration: string
  studyYears: string
  degreeType?: string | null
  /** Owning department id ('' when the program has no department). */
  departmentId: string
}

export interface PublicCollegeFacultyItem {
  id: string
  slug: string
  fullName: string
  academicTitle: string
  biography: string
  email: string
  phone: string
  photo: string | null
  departmentId?: string
}

export interface PublicCollegeDepartmentItem {
  id: string
  name: string
  description: string
  headOfDepartment: {
    id: string
    fullName: string
    photo: string | null
  } | null
  programs: PublicCollegeProgramItem[]
  faculty: PublicCollegeFacultyItem[]
}

export interface PublicKeyInstructorItem {
  id: string
  slug: string
  fullName: string
  academicTitle: string
  photo: string | null
}

export interface PublicCollegeNewsItem {
  id: string
  slug: string
  title: string
  summary: string
  publishDate: string
}

export interface PublicCollegeEventItem {
  id: string
  slug: string
  title: string
  description: string
  eventDate: string
  location: string
}

export interface PublicCollegeLoaderOptions {
  limit?: number
  locale?: Locale
  /**
   * Set from Next.js draft mode so an editor previewing an unpublished
   * college (or program, or study plan) sees their draft rather than the
   * published version. Off for every public visitor.
   */
  draft?: boolean
  documentId?: number | string
  user?: User
}

/**
 * Options for the shared college DB-fetch helper.
 *
 * Issue #43 — `getPublicColleges` (homepage view-model) and
 * `getPublicCollegesList` (route-bound raw docs) previously each duplicated
 * the `payload.find({ collection: 'colleges', depth: 1, overrideAccess:
 * false, ... })` call. This helper centralises the common fetch so the two
 * loaders only differ in their `where`/`limit`/`sort` inputs and their
 * return-type mapping.
 */
interface FindCollegesOptions {
  where?: Where
  limit?: number
  sort?: string
  locale?: Locale
  draft?: boolean
  user?: User
}

async function findColleges(options: FindCollegesOptions = {}): Promise<College[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  const locale = options.locale ?? 'ar'
  const draft = options.draft ?? false
  const result = await payload.find({
    collection: 'colleges',
    where: options.where ?? PUBLISHED_WHERE,
    limit: options.limit,
    sort: options.sort,
    depth: 1,
    locale,
    draft,
    overrideAccess: false,
    ...(draft && options.user ? { user: options.user } : {}),
  })

  return result.docs as College[]
}

export async function getPublicColleges(
  options: GetPublicCollegesOptions = {},
): Promise<HomeFallbackCollege[]> {
  if (options.readContext?.draft) return queryCollegeItems(options)
  return getPublishedCollegeItems({
    limit: options.limit,
    locale: options.locale,
    selectedColleges: options.selectedColleges,
  })
}

async function getPublishedCollegeItems(options: Omit<GetPublicCollegesOptions, 'readContext'>): Promise<HomeFallbackCollege[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'))
  return queryCollegeItems(options)
}

async function queryCollegeItems(options: GetPublicCollegesOptions): Promise<HomeFallbackCollege[]> {
  const limit = Math.max(1, Math.min(8, Math.trunc(options.limit ?? 4)))
  const locale = options.locale ?? 'ar'
  const selectedIds = relationshipIds(options.selectedColleges)

  try {
    // Issue #43: the `payload.find({ collection: 'colleges', ... })` call is
    // shared with `getPublicCollegesList` via `findColleges`. The two loaders
    // differ only in their `where`/`limit`/`sort` and return-type mapping.
    const draft = options.readContext?.draft ?? false
    const publicWhere = draft ? undefined : PUBLISHED_WHERE
    const docs = await findColleges({
      where:
        selectedIds.length > 0
          ? {
              and: [{ id: { in: selectedIds } }, ...(publicWhere ? [publicWhere] : [])],
            }
          : (publicWhere ?? {}),
      // If user selected specific IDs, fetch them all to sort them in JS. Otherwise, use block limit.
      limit: selectedIds.length > 0 ? selectedIds.length : limit,
      locale,
      draft,
      user: options.readContext?.draft ? options.readContext.user : undefined,
    })

    // Empty CMS → empty list; CollegesGrid renders nothing (the old
    // fake-colleges fallback with invented counts was removed).
    if (docs.length === 0) return []

    // If the user manually selected colleges, Payload's DB query might return them in primary key
    // or creation order. We must re-sort them to exactly match the order the user arranged them in.
    let sortedDocs = docs
    if (selectedIds.length > 0) {
      sortedDocs = sortedDocs.sort((a, b) => {
        const indexA = selectedIds.findIndex((id) => String(id) === String(a.id))
        const indexB = selectedIds.findIndex((id) => String(id) === String(b.id))
        // Push missing items to the end (should not happen)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    }

    // Apply the block limit after sorting
    sortedDocs = sortedDocs.slice(0, limit)

    // Issue #45: fetch per-college program + faculty counts in a single
    // batched round-trip per collection instead of one `count` query per
    // college (eliminates the N+1 pattern: 8 colleges × 2 collections = 16
    // round-trips → 2 round-trips).
    const payload = await getPayloadSafe()
    const counts = payload
      ? await buildCollegeCounts(
          payload,
          sortedDocs.map((d) => d.id),
          options.readContext?.draft
            ? { draft: true, user: options.readContext.user }
            : { draft: false },
        )
      : { programs: new Map<string, number>(), faculty: new Map<string, number>() }

    const mappedDocs = sortedDocs.map(
      (doc: College): HomeFallbackCollege => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        name: doc.name || '',
        description: richTextToPlainText(doc.description),
        image: resolveMediaUrl(doc.image) ?? null,
        programsCount: counts.programs.get(String(doc.id)) ?? 0,
        facultyCount: counts.faculty.get(String(doc.id)) ?? 0,
      }),
    )

    return mappedDocs
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

function mapCollegeDetail(doc: College): PublicCollegeDetail {
  return {
    id: String(doc.id ?? ''),
    slug: doc.slug || String(doc.id ?? ''),
    name: doc.name || '',
    description: doc.description,
    admissionRequirements: doc.admissionRequirements,
    vision: doc.vision,
    mission: doc.mission,
    goals: doc.goals,
    values: doc.values,
    strategy: doc.strategy,
    quality: doc.quality,
    icon: typeof doc.icon === 'string' ? doc.icon : null,
    image: resolveMediaUrl(doc.image) ?? null,
    deanName: typeof doc.deanName === 'string' ? doc.deanName : '',
    deanImage: resolveMediaUrl(doc.deanImage) ?? null,
    programsCount: 0,
    facultyCount: 0,
    departmentsCount: 0,
    meta: doc.meta,
  }
}

async function findCollegeBySlug(
  slug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<College | null> {
  // Issue #43: delegate to the shared `findColleges` helper so all college
  // list/single fetches flow through one DB-fetch path.
  const draft = options.draft ?? false
  const docs = await findColleges({
    where: draft
      ? { slug: { equals: slug } }
      : { and: [{ slug: { equals: slug } }, PUBLISHED_WHERE] },
    limit: 1,
    locale: options.locale,
    draft,
    user: options.user,
  })
  return docs[0] ?? null
}

export async function getCollegeBySlug(
  slug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeDetail | null> {
  if (options.draft) return queryCollegeBySlug(slug, options)
  return getPublishedCollegeBySlug(slug, options.locale)
}

async function getPublishedCollegeBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicCollegeDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'))
  return queryCollegeBySlug(slug, { locale })
}

async function queryCollegeBySlug(
  slug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeDetail | null> {
  try {
    const doc = options.draft && options.documentId != null && options.user
      ? await getDraftPreviewDocument({
          collection: 'colleges',
          documentId: options.documentId,
          depth: 1,
          locale: options.locale,
          user: options.user,
        })
      : await findCollegeBySlug(slug, options)
    if (!doc) return null

    const payload = await getPayloadSafe()
    if (!payload) return mapCollegeDetail(doc)

    // Issue #46: the three count queries (programs, faculty, departments) are
    // independent of each other — run them concurrently via `Promise.all`
    // instead of awaiting each one sequentially. This cuts the wait time from
    // the sum of the three round-trips to their maximum.
    const draft = options.draft ?? false
    const countsWhere = {
      and: [{ college: { equals: doc.id } }, ...(draft ? [] : [publishedWithRelations('college')])],
    }

    const countCollection = async (
      collection: 'academic-departments' | 'academic-programs' | 'faculty-members',
    ): Promise<number> => {
      if (!draft) {
        const result = await payload.count({
          collection,
          where: countsWhere,
          overrideAccess: false,
        })
        return result.totalDocs || 0
      }

      const result = await payload.find({
        collection,
        where: countsWhere,
        limit: 0,
        depth: 0,
        draft: true,
        overrideAccess: false,
        user: options.user,
      })
      return result.docs.length
    }

    const [programsCount, facultyCount, departmentsCount] = await Promise.all([
      countCollection('academic-programs'),
      countCollection('faculty-members'),
      countCollection('academic-departments'),
    ])

    const detail = mapCollegeDetail(doc)
    detail.programsCount = programsCount
    detail.facultyCount = facultyCount
    detail.departmentsCount = departmentsCount

    return detail
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}

/**
 * Where clause scoping a collection to an active college addressed by slug.
 *
 * Uses Payload's relationship-path querying (`'college.slug'`) so scoped
 * loaders run a single query instead of the legacy two-step
 * resolve-slug-then-filter chain (one round-trip saved per loader call, and
 * the repeated `colleges where slug = X` lookup disappears entirely).
 */
function scopedToCollege(collegeSlug: string): Where[] {
  return [{ 'college.slug': { equals: collegeSlug } }]
}

export async function getCollegePrograms(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeProgramItem[]> {
  if (options.draft) return queryCollegePrograms(collegeSlug, options)
  return getPublishedCollegePrograms(collegeSlug, options.locale, options.limit)
}

async function getPublishedCollegePrograms(
  collegeSlug: string,
  locale?: Locale,
  limit?: number,
): Promise<PublicCollegeProgramItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'), collectionCacheTag('academic-programs'))
  return queryCollegePrograms(collegeSlug, { locale, limit })
}

async function queryCollegePrograms(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeProgramItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    const result = await payload.find({
      collection: 'academic-programs',
      where: {
        and: [
          ...scopedToCollege(collegeSlug),
          ...(draft ? [] : [publishedWithRelations('college')]),
        ],
      },
      // A college's full programme/staff list, not a homepage strip: the
      // block default of 4 truncated `/colleges/<slug>` and the dedicated
      // faculty directory to four rows. `depth: 1` populates `photo` — at
      // depth 0 it is a bare media id, which `resolveMediaUrl` cannot turn
      // into a URL, so every faculty portrait fell back to a placeholder.
      ...buildPublicQueryOptions({
        ...options,
        sort: 'displayOrder',
        depth: 1,
        limit: options.limit ?? 100,
      }),
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return result.docs.map(
      (doc: AcademicProgram): PublicCollegeProgramItem => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        name: doc.name || '',
        description: richTextToPlainText(doc.description),
        objectives: richTextToPlainText(doc.objectives),
        careerProspects: richTextToPlainText(doc.careerProspects),
        applicationSteps: richTextToPlainText(doc.applicationSteps),
        whyProgram: richTextToPlainText(doc.whyProgram),
        highSchoolType: typeof doc.highSchoolType === 'string' ? doc.highSchoolType : '',
        duration: typeof doc.duration === 'string' ? doc.duration : '',
        studyYears: typeof doc.studyYears === 'string' ? doc.studyYears : '',
        degreeType: doc.degreeType,
        // depth is 1 here, so `department` may be populated or remain a raw id.
        // Exposing it lets getCollegeDepartmentsWithPrograms group programs
        // without re-fetching the collection (the old `rawPrograms` query).
        departmentId: String(extractRelationId(doc.department) ?? ''),
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCollegeFaculty(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeFacultyItem[]> {
  if (options.draft) return queryCollegeFaculty(collegeSlug, options)
  return getPublishedCollegeFaculty(collegeSlug, options.locale, options.limit)
}

async function getPublishedCollegeFaculty(
  collegeSlug: string,
  locale?: Locale,
  limit?: number,
): Promise<PublicCollegeFacultyItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'), collectionCacheTag('faculty-members'))
  return queryCollegeFaculty(collegeSlug, { locale, limit })
}

async function queryCollegeFaculty(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeFacultyItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    const result = await payload.find({
      collection: 'faculty-members',
      where: {
        and: [
          ...scopedToCollege(collegeSlug),
          ...(draft ? [] : [publishedWithRelations('college')]),
        ],
      },
      // A college's full programme/staff list, not a homepage strip: the
      // block default of 4 truncated `/colleges/<slug>` and the dedicated
      // faculty directory to four rows. `depth: 1` populates `photo` — at
      // depth 0 it is a bare media id, which `resolveMediaUrl` cannot turn
      // into a URL, so every faculty portrait fell back to a placeholder.
      ...buildPublicQueryOptions({
        ...options,
        sort: 'displayOrder',
        depth: 1,
        limit: options.limit ?? 100,
      }),
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return result.docs.map(
      (doc: FacultyMember): PublicCollegeFacultyItem => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        fullName: doc.fullName || '',
        academicTitle: typeof doc.academicTitle === 'string' ? doc.academicTitle : '',
        biography: richTextToPlainText(doc.biography),
        email: typeof doc.email === 'string' ? doc.email : '',
        phone: typeof doc.phone === 'string' ? doc.phone : '',
        photo: resolveMediaUrl(doc.photo) ?? null,
        departmentId: String(extractRelationId(doc.department) ?? ''),
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCollegeDepartmentsWithPrograms(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeDepartmentItem[]> {
  if (options.draft) return queryCollegeDepartments(collegeSlug, options)
  return getPublishedCollegeDepartments(collegeSlug, options.locale, options.limit)
}

async function getPublishedCollegeDepartments(
  collegeSlug: string,
  locale?: Locale,
  limit?: number,
): Promise<PublicCollegeDepartmentItem[]> {
  'use cache'

  applyPublicCacheTags(
    collectionCacheTag('colleges'),
    collectionCacheTag('academic-departments'),
    collectionCacheTag('academic-programs'),
    collectionCacheTag('faculty-members'),
  )
  return queryCollegeDepartments(collegeSlug, { locale, limit })
}

async function queryCollegeDepartments(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeDepartmentItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    // The three fetches are independent — departments via a relationship-path
    // query, programs and faculty via their (cached) loaders which now carry
    // `departmentId`, so the old duplicate raw-programs query is gone and the
    // college slug is never re-resolved.
    const [deptResult, allPrograms, allFaculty] = await Promise.all([
      payload.find({
        collection: 'academic-departments',
        where: {
          and: [
            ...scopedToCollege(collegeSlug),
            ...(draft ? [] : [publishedWithRelations('college')]),
          ],
        },
        depth: 2, // Need depth 2 to get the headOfDepartment's photo
        locale: options.locale ?? 'ar',
        limit: 100,
        draft,
        overrideAccess: false,
        user: options.user,
      }),
      getCollegePrograms(collegeSlug, options),
      getCollegeFaculty(collegeSlug, options),
    ])

    if (deptResult.docs.length === 0 && allPrograms.length > 0) {
      // Fallback: If no departments are defined, but programs exist, group them in a default category
      return [
        {
          id: 'default',
          name: options.locale === 'ar' ? 'الأقسام الأكاديمية' : 'Academic Departments',
          description: '',
          headOfDepartment: null,
          programs: allPrograms,
          faculty: allFaculty,
        },
      ]
    }

    const mappedDepts = deptResult.docs.map(
      (doc: AcademicDepartment): PublicCollegeDepartmentItem => {
        // Find programs belonging to this department
        const deptPrograms = allPrograms.filter((p) => p.departmentId === String(doc.id))

        let hod = null
        if (doc.headOfDepartment) {
          const hodDoc = doc.headOfDepartment as FacultyMember
          hod = {
            id: String(hodDoc.id),
            fullName: hodDoc.fullName,
            photo: resolveMediaUrl(hodDoc.photo) ?? null,
          }
        }

        return {
          id: String(doc.id ?? ''),
          name: doc.name || '',
          description: richTextToPlainText(doc.description),
          headOfDepartment: hod,
          programs: deptPrograms,
          faculty: allFaculty.filter((f) => f.departmentId === String(doc.id)),
        }
      },
    )

    const unassignedPrograms = allPrograms.filter((p) => !p.departmentId)
    const unassignedFaculty = allFaculty.filter((f) => !f.departmentId)

    if (unassignedPrograms.length > 0 || unassignedFaculty.length > 0) {
      mappedDepts.push({
        id: 'unassigned',
        name: options.locale === 'ar' ? 'برامج عامة' : 'General Programs',
        description: '',
        headOfDepartment: null,
        programs: unassignedPrograms,
        faculty: unassignedFaculty,
      })
    }

    return mappedDepts
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getProgramKeyInstructors(
  programId: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicKeyInstructorItem[]> {
  if (options.draft) return queryProgramKeyInstructors(programId, options)
  return getPublishedProgramKeyInstructors(programId, options.locale)
}

async function getPublishedProgramKeyInstructors(
  programId: string,
  locale?: Locale,
): Promise<PublicKeyInstructorItem[]> {
  'use cache'

  applyPublicCacheTags(
    collectionCacheTag('academic-programs'),
    collectionCacheTag('faculty-members'),
  )
  return queryProgramKeyInstructors(programId, { locale })
}

async function queryProgramKeyInstructors(
  programId: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicKeyInstructorItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    // `program` is a `hasMany` relationship on FacultyMembers. The previous
    // implementation used `contains` (a text-field operator that does
    // substring matching) on the numeric relationship ID. Passing a string
    // like "42" matched IDs 42, 142, 420, 1042… — leaking faculty from other
    // programs. Use `equals` with a numeric coercion so Payload matches the
    // exact relationship value. Reject non-positive / non-numeric inputs
    // (empty strings, slug text) so they cannot leak into the relationship
    // query and silently match the wrong rows.
    const numericProgramId = Number(programId)
    if (!Number.isFinite(numericProgramId) || numericProgramId <= 0) return []

    const result = await payload.find({
      collection: 'faculty-members',
      where: {
        and: [
          { program: { equals: numericProgramId } },
          ...(draft ? [] : [publishedWithRelations('college')]),
        ],
      },
      depth: 1, // to get photo
      limit: 4, // Max 4 key instructors
      locale: options.locale ?? 'ar',
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return result.docs.map(
      (doc: FacultyMember): PublicKeyInstructorItem => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        fullName: doc.fullName || '',
        academicTitle: typeof doc.academicTitle === 'string' ? doc.academicTitle : '',
        photo: resolveMediaUrl(doc.photo) ?? null,
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCollegeNews(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeNewsItem[]> {
  if (options.draft) return queryCollegeNews(collegeSlug, options)
  return getPublishedCollegeNews(collegeSlug, options.locale, options.limit)
}

async function getPublishedCollegeNews(
  collegeSlug: string,
  locale?: Locale,
  limit?: number,
): Promise<PublicCollegeNewsItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'), collectionCacheTag('news'))
  return queryCollegeNews(collegeSlug, { locale, limit })
}

async function queryCollegeNews(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeNewsItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    const result = await payload.find({
      collection: 'news',
      where: {
        and: [
          ...scopedToCollege(collegeSlug),
          ...(draft ? [] : [publishedWithRelations('college')]),
        ],
      },
      ...buildPublicQueryOptions({ ...options, sort: '-publishedAt' }),
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return result.docs.map(
      (doc: News): PublicCollegeNewsItem => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        title: doc.title || '',
        summary: richTextToPlainText(doc.summary),
        // Public UI field keeps the legacy `publishDate` label; source is the
        // renamed Payload `publishedAt` column (V2-01 schema repair).
        publishDate: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getCollegeEvents(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions = {},
): Promise<PublicCollegeEventItem[]> {
  if (options.draft) return queryCollegeEvents(collegeSlug, options)
  return getPublishedCollegeEvents(collegeSlug, options.locale, options.limit)
}

async function getPublishedCollegeEvents(
  collegeSlug: string,
  locale?: Locale,
  limit?: number,
): Promise<PublicCollegeEventItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'), collectionCacheTag('events'))
  return queryCollegeEvents(collegeSlug, { locale, limit })
}

async function queryCollegeEvents(
  collegeSlug: string,
  options: PublicCollegeLoaderOptions,
): Promise<PublicCollegeEventItem[]> {
  try {
    const draft = options.draft ?? false
    const payload = await getPayloadSafe()
    if (!payload) return []

    const result = await payload.find({
      collection: 'events',
      where: {
        and: [
          ...scopedToCollege(collegeSlug),
          ...(draft ? [] : [publishedWithRelations('college')]),
        ],
      },
      ...buildPublicQueryOptions({ ...options, sort: '-eventDate' }),
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return result.docs.map(
      (doc: Event): PublicCollegeEventItem => ({
        id: String(doc.id ?? ''),
        slug: doc.slug || String(doc.id ?? ''),
        title: doc.title || '',
        description: richTextToPlainText(doc.description),
        eventDate: typeof doc.eventDate === 'string' ? doc.eventDate : '',
        location: typeof doc.location === 'string' ? doc.location : '',
      }),
    )
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

// ─── Raw-doc loaders for route-bound pages ────────────────────────────────
//
// The summary loaders above return view-models (plain-text descriptions,
// URL strings for media) that suit homepage blocks. Route-bound list and
// detail pages need richer representations: <CollegeCard> expects the
// populated `Media` doc, and program/faculty detail pages render rich
// text via <RichText>, which requires the Lexical `root` tree.
//
// The loaders below return raw Payload documents (depth:1 so media and
// shallow relationships are populated). They use the same access-control
// and cache-tag conventions as the summary loaders.

export interface PublicCollegeListOptions {
  limit?: number
  locale?: Locale
}

/**
 * Fetch active colleges as raw `College` documents (depth:1 so `image`
 * is populated). Used by the `/colleges` list route, which renders each
 * doc through {@link CollegeCard} — the card expects the populated
 * `Media` object, not a URL string.
 *
 * Returns an empty array when Payload is unreachable; the caller renders
 * {@link EmptyState} in that case.
 */
export async function getPublicCollegesList(
  options: PublicCollegeListOptions = {},
): Promise<College[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'))

  const locale = options.locale ?? 'ar'
  // Route-bound list pages intentionally allow larger result sets than the
  // homepage blocks (which cap at 8). Clamp to a sane upper bound to avoid
  // unbounded queries on a compromised DB.
  const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 50)))

  try {
    // Issue #43: shared `findColleges` helper replaces the inline
    // `payload.find({ collection: 'colleges', ... })` call — the same fetch
    // is used by `getPublicColleges`, differing only in where/limit/sort.
    const docs = await findColleges({
      where: PUBLISHED_WHERE,
      limit,
      sort: 'name',
      locale,
    })

    // Issue #45: fetch per-college program + faculty counts in a single
    // batched round-trip per collection instead of one `count` query per
    // college (eliminates the N+1 pattern: 50 colleges × 2 collections = 100
    // round-trips → 2 round-trips).
    const payload = await getPayloadSafe()
    const counts = payload
      ? await buildCollegeCounts(
          payload,
          docs.map((d) => d.id),
        )
      : { programs: new Map<string, number>(), faculty: new Map<string, number>() }

    const mappedDocs = docs.map((doc) => ({
      ...doc,
      programsCount: counts.programs.get(String(doc.id)) ?? 0,
      facultyCount: counts.faculty.get(String(doc.id)) ?? 0,
    }))

    return mappedDocs as unknown as College[]
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export interface PublicCollegeProgramOptions {
  locale?: Locale
  /**
   * Set from Next.js draft mode so an editor previewing an unpublished
   * document sees their draft. Off for every public visitor.
   */
  draft?: boolean
  documentId?: number | string
  user?: User
}

/**
 * Fetch a single academic program scoped to a college slug.
 *
 * `programId` may be either the program's numeric id (as a string) or
 * its slug. The college slug is enforced via the `college` relationship,
 * so a program from a different college will not match — the function
 * returns `null` in that case (rendered as 404 by the route).
 *
 * Returns the raw `AcademicProgram` document with depth:1 so the
 * program detail route can render rich text fields through <RichText>
 * and the parent `college` reference is populated for breadcrumb links.
 */
export async function getCollegeProgram(
  collegeSlug: string,
  programId: string,
  options: PublicCollegeProgramOptions = {},
): Promise<AcademicProgram | null> {
  if (options.draft) return queryCollegeProgram(collegeSlug, programId, options)
  return getPublishedCollegeProgram(collegeSlug, programId, options.locale)
}

async function getPublishedCollegeProgram(
  collegeSlug: string,
  programId: string,
  locale?: Locale,
): Promise<AcademicProgram | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('colleges'), collectionCacheTag('academic-programs'))
  return queryCollegeProgram(collegeSlug, programId, { locale })
}

async function queryCollegeProgram(
  collegeSlug: string,
  programId: string,
  options: PublicCollegeProgramOptions,
): Promise<AcademicProgram | null> {
  const locale = options.locale ?? 'ar'

  try {
    if (options.draft && options.documentId != null && options.user) {
      return await getDraftPreviewDocument({
        collection: 'academic-programs',
        documentId: options.documentId,
        depth: 1,
        locale,
        user: options.user,
      })
    }

    const payload = await getPayloadSafe()
    if (!payload) return null

    // Build an `or` clause so the route accepts both id- and slug-based
    // URLs (legacy frontend used `[id]`, the V2 spec uses slug).
    const draft = options.draft ?? false
    // In draft mode drop the published-only filter on the program itself. The
    // college scope stays: a draft program still belongs to exactly one
    // college, and previewing it must not reach across into another's.
    const result = await payload.find({
      collection: 'academic-programs',
      where: {
        and: [
          ...scopedToCollege(collegeSlug),
          ...(draft ? [] : [publishedWithRelations('college')]),
          {
            or: [{ id: { equals: programId } }, { slug: { equals: programId } }],
          },
        ],
      },
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    return (result.docs[0] as AcademicProgram | undefined) ?? null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
