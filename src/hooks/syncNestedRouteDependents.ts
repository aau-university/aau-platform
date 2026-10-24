import type { CollectionBeforeDeleteHook, PayloadRequest } from 'payload'

import { buildStudyPlanPathFromProgramPath } from '@/utilities/collectionRoutes'

import { syncManagedRedirects } from './managedRedirectLifecycle'

type RouteDocument = {
  academicProgram?: unknown
  id?: unknown
  slug?: unknown
}

type NestedDeleteSnapshot = {
  plans: RouteDocument[]
  programs: RouteDocument[]
}

const NESTED_DELETE_SNAPSHOTS = '__nestedRouteDeleteSnapshots'

type NestedDeleteSnapshotStore = Record<string, Record<string, NestedDeleteSnapshot>>

function snapshotStore(context: Record<string, unknown>): NestedDeleteSnapshotStore {
  const existing = context[NESTED_DELETE_SNAPSHOTS]
  if (existing && typeof existing === 'object') {
    return existing as NestedDeleteSnapshotStore
  }
  const created: NestedDeleteSnapshotStore = {}
  context[NESTED_DELETE_SNAPSHOTS] = created
  return created
}

function capturedDependents(
  req: PayloadRequest,
  collection: 'academic-programs' | 'colleges',
  id: number | string,
): NestedDeleteSnapshot | undefined {
  return snapshotStore(req.context)[collection]?.[String(id)]
}

function relationId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  const id = (value as { id?: unknown }).id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

function childPath(parent: string | null, segment: string): string | null {
  if (!parent || !segment) return null
  return `${parent}/programs/${segment}`
}

/**
 * Capture routed children before Payload applies relationship `onDelete`
 * behavior. PostgreSQL may null a child's foreign key before `afterDelete`,
 * so an after-delete query alone cannot reliably discover routes invalidated
 * by deleting a College or Academic Program.
 */
export const captureNestedRouteDependentsBeforeDelete: CollectionBeforeDeleteHook = async ({
  collection,
  context,
  id,
  req,
}) => {
  if (collection.slug !== 'colleges' && collection.slug !== 'academic-programs') return

  const programs = collection.slug === 'colleges'
    ? ((await req.payload.find({
        collection: 'academic-programs',
        depth: 0,
        draft: false,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        req,
        where: {
          and: [
            { college: { equals: id } },
            { _status: { equals: 'published' } },
          ],
        },
      })).docs as RouteDocument[])
    : []

  const programIds = collection.slug === 'colleges'
    ? programs
        .map((program) => relationId(program.id))
        .filter((programId): programId is number | string => programId != null)
    : [id]

  const plans = programIds.length > 0
    ? ((await req.payload.find({
        collection: 'study-plans',
        depth: 0,
        draft: false,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        req,
        where: {
          and: [
            { academicProgram: { in: programIds } },
            { _status: { equals: 'published' } },
          ],
        },
      })).docs as RouteDocument[])
    : []

  const store = snapshotStore(context)
  store[collection.slug] ??= {}
  store[collection.slug][String(id)] = { plans, programs }
}

/**
 * A College slug/status mutation changes the canonical URLs and public
 * availability of its published Programs and Study Plans even though their
 * own hooks do not run. Keep those official redirect rows and path caches in
 * sync without creating another redirect persistence model.
 */
export async function syncCollegeRouteDependents({
  collegeId,
  currentCollegePath,
  isPublic,
  previousCollegePath,
  req,
}: {
  collegeId: number | string
  currentCollegePath: string | null
  isPublic: boolean
  previousCollegePath: string | null
  req: PayloadRequest
}): Promise<string[]> {
  if (isPublic && currentCollegePath === previousCollegePath) return []

  const captured = capturedDependents(req, 'colleges', collegeId)
  const programsResult = captured ? { docs: captured.programs } : await req.payload.find({
    collection: 'academic-programs',
    depth: 0,
    draft: false,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { college: { equals: collegeId } },
        { _status: { equals: 'published' } },
      ],
    },
  })
  const programs = programsResult.docs as RouteDocument[]
  const programIds = programs
    .map((program) => relationId(program.id))
    .filter((id): id is number | string => id != null)

  const plansResult = captured
    ? { docs: captured.plans }
    : programIds.length > 0
    ? await req.payload.find({
        collection: 'study-plans',
        depth: 0,
        draft: false,
        limit: 0,
        overrideAccess: true,
        pagination: false,
        req,
        where: {
          and: [
            { academicProgram: { in: programIds } },
            { _status: { equals: 'published' } },
          ],
        },
      })
    : { docs: [] }
  const plans = plansResult.docs as RouteDocument[]
  const plansByProgram = new Map<string, RouteDocument[]>()
  for (const plan of plans) {
    const programId = relationId(plan.academicProgram)
    if (programId == null) continue
    const key = String(programId)
    plansByProgram.set(key, [...(plansByProgram.get(key) ?? []), plan])
  }

  const affectedPaths: string[] = []
  for (const program of programs) {
    const programId = relationId(program.id)
    const slug = typeof program.slug === 'string' ? program.slug.trim() : ''
    if (programId == null || !slug) continue

    const currentPath = isPublic ? childPath(currentCollegePath, slug) : null
    const previousPath = childPath(previousCollegePath, slug)
    await syncManagedRedirects({
      collection: 'academic-programs',
      currentPath,
      documentId: programId,
      isPublic,
      previousPath,
      req,
      routeKey: 'detail',
    })
    if (currentPath) affectedPaths.push(currentPath)
    if (previousPath) affectedPaths.push(previousPath)

    for (const plan of plansByProgram.get(String(programId)) ?? []) {
      const planId = relationId(plan.id)
      if (planId == null) continue
      const currentPlanPath = isPublic
        ? buildStudyPlanPathFromProgramPath(currentPath)
        : null
      const previousPlanPath = buildStudyPlanPathFromProgramPath(previousPath)
      await syncManagedRedirects({
        collection: 'study-plans',
        currentPath: currentPlanPath,
        documentId: planId,
        isPublic,
        previousPath: previousPlanPath,
        req,
        routeKey: 'detail',
      })
      if (currentPlanPath) affectedPaths.push(currentPlanPath)
      if (previousPlanPath) affectedPaths.push(previousPlanPath)
    }
  }

  return affectedPaths
}

/**
 * A Program route mutation also changes the canonical route of each published
 * Study Plan related to it. The Study Plan document remains the sole owner of
 * that redirect authority, including after the plan is unpublished.
 */
export async function syncProgramRouteDependents({
  currentProgramPath,
  isPublic,
  previousProgramPath,
  programId,
  req,
}: {
  currentProgramPath: string | null
  isPublic: boolean
  previousProgramPath: string | null
  programId: number | string
  req: PayloadRequest
}): Promise<string[]> {
  if (isPublic && currentProgramPath === previousProgramPath) return []

  const captured = capturedDependents(req, 'academic-programs', programId)
  const plansResult = captured ? { docs: captured.plans } : await req.payload.find({
    collection: 'study-plans',
    depth: 0,
    draft: false,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { academicProgram: { equals: programId } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  const currentPath = isPublic
    ? buildStudyPlanPathFromProgramPath(currentProgramPath)
    : null
  const previousPath = buildStudyPlanPathFromProgramPath(previousProgramPath)
  const affectedPaths: string[] = []

  for (const plan of plansResult.docs as RouteDocument[]) {
    const planId = relationId(plan.id)
    if (planId == null) continue
    await syncManagedRedirects({
      collection: 'study-plans',
      currentPath,
      documentId: planId,
      isPublic,
      previousPath,
      req,
      routeKey: 'detail',
    })
    if (currentPath) affectedPaths.push(currentPath)
    if (previousPath) affectedPaths.push(previousPath)
  }

  return affectedPaths
}
