import { randomUUID } from 'node:crypto'

import { ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { User } from '@/payload-types'

const FIXTURE_CONTEXT = { disableRevalidate: true } as const
const revalidatePathMock = vi.fn()
const revalidateTagMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))
type AcademicCollection =
  | 'academic-programs'
  | 'academic-departments'
  | 'faculty-members'
  | 'study-plans'

type TrackedCollection = AcademicCollection | 'colleges' | 'pages'

let payload: Payload
const cleanup: Array<{ collection: TrackedCollection; id: number | string }> = []

describe('academic publication integrity through Payload Local API', () => {
  beforeAll(async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    payload = await getPayload({ config: await config })
  }, 30_000)

  afterAll(async () => {
    for (const fixture of cleanup.reverse()) {
      await payload
        ?.delete({
          collection: fixture.collection,
          context: FIXTURE_CONTEXT,
          id: fixture.id,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }
    await payload?.destroy()
  }, 30_000)

  it('hides published children until every required parent is published', async () => {
    const suffix = randomUUID()
    const college = await payload.create({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Publication Test College ${suffix}`,
        slug: `publication-test-college-${suffix}`,
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    track('colleges', college.id)

    const program = await payload.create({
      collection: 'academic-programs',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Publication Test Program ${suffix}`,
        slug: `publication-test-program-${suffix}`,
        college: college.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('academic-programs', program.id)

    const department = await payload.create({
      collection: 'academic-departments',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Publication Test Department ${suffix}`,
        slug: `publication-test-department-${suffix}`,
        college: college.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('academic-departments', department.id)

    const faculty = await payload.create({
      collection: 'faculty-members',
      context: FIXTURE_CONTEXT,
      data: {
        fullName: `Publication Test Faculty ${suffix}`,
        slug: `publication-test-faculty-${suffix}`,
        college: college.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('faculty-members', faculty.id)

    const plan = await payload.create({
      collection: 'study-plans',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Publication Test Plan ${suffix}`,
        slug: `publication-test-plan-${suffix}`,
        academicProgram: program.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('study-plans', plan.id)
    expect(String(relationshipID(plan.college))).toBe(String(college.id))

    const fixtures = [
      ['academic-programs', program.id],
      ['academic-departments', department.id],
      ['faculty-members', faculty.id],
      ['study-plans', plan.id],
    ] as const
    const coordinator = coordinatorUser(college.id)
    const otherCoordinator = coordinatorUser(Number(college.id) + 1)
    const contentManager = contentManagerUser()

    for (const [collection, id] of fixtures) {
      await expect(visibleCount(collection, id)).resolves.toBe(0)
      await expect(visibleCount(collection, id, coordinator, true)).resolves.toBe(1)
      await expect(visibleCount(collection, id, otherCoordinator, true)).resolves.toBe(0)
      await expect(visibleCount(collection, id, contentManager, true)).resolves.toBe(1)
    }

    await payload.update({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: { _status: 'published' },
      id: college.id,
      overrideAccess: true,
    })

    for (const [collection, id] of fixtures) {
      await expect(visibleCount(collection, id)).resolves.toBe(1)
    }

    const draftProgram = await payload.create({
      collection: 'academic-programs',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Draft Parent Program ${suffix}`,
        slug: `draft-parent-program-${suffix}`,
        college: college.id,
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    track('academic-programs', draftProgram.id)

    const childPlan = await payload.create({
      collection: 'study-plans',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Published Child Plan ${suffix}`,
        slug: `published-child-plan-${suffix}`,
        academicProgram: draftProgram.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('study-plans', childPlan.id)

    await expect(visibleCount('study-plans', childPlan.id)).resolves.toBe(0)
    await expect(visibleCount('study-plans', childPlan.id, coordinator, true)).resolves.toBe(1)
    await expect(visibleCount('study-plans', childPlan.id, contentManager, true)).resolves.toBe(1)

    await payload.update({
      collection: 'academic-programs',
      context: FIXTURE_CONTEXT,
      data: { _status: 'published' },
      id: draftProgram.id,
      overrideAccess: true,
    })

    await expect(visibleCount('study-plans', childPlan.id)).resolves.toBe(1)
  }, 60_000)

  it('allows exactly one study plan when two creates race for the same program', async () => {
    const suffix = randomUUID()
    const college = await payload.create({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Unique Plan College ${suffix}`,
        slug: `unique-plan-college-${suffix}`,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('colleges', college.id)

    const program = await payload.create({
      collection: 'academic-programs',
      context: FIXTURE_CONTEXT,
      data: {
        name: `Unique Plan Program ${suffix}`,
        slug: `unique-plan-program-${suffix}`,
        college: college.id,
        _status: 'published',
      },
      overrideAccess: true,
    })
    track('academic-programs', program.id)

    const attempts = await Promise.allSettled(
      [1, 2].map((index) =>
        payload.create({
          collection: 'study-plans',
          context: FIXTURE_CONTEXT,
          data: {
            name: `Concurrent Plan ${index} ${suffix}`,
            slug: `concurrent-plan-${index}-${suffix}`,
            academicProgram: program.id,
            _status: 'draft',
          },
          draft: true,
          overrideAccess: true,
        }),
      ),
    )

    const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled')
    const rejected = attempts.filter((attempt) => attempt.status === 'rejected')

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    track('study-plans', fulfilled[0]!.value.id)
    expect(rejected[0]!.reason).toBeInstanceOf(ValidationError)
    expect((rejected[0]!.reason as ValidationError).data.errors).toContainEqual(
      expect.objectContaining({
        path: 'academicProgram',
        tableName: 'study_plans',
      }),
    )
    expect((rejected[0]!.reason as ValidationError).data.errors[0]?.message).toEqual(
      expect.any(String),
    )

    const persisted = await payload.find({
      collection: 'study-plans',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: { academicProgram: { equals: program.id } },
    })
    expect(persisted.totalDocs).toBe(1)
  }, 60_000)

  it.each([
    {
      label: 'direct Local API status update',
      unpublish: (id: number | string) =>
        payload.update({
          collection: 'colleges',
          data: { _status: 'draft' },
          draft: false,
          id,
          overrideAccess: true,
        }),
    },
    {
      label: 'unpublishAllLocales',
      unpublish: (id: number | string) =>
        payload.update({
          collection: 'colleges',
          data: {},
          id,
          overrideAccess: true,
          unpublishAllLocales: true,
        }),
    },
  ])(
    'keeps autosave private and invalidates the public row through $label',
    async ({ unpublish }) => {
      const suffix = randomUUID()
      const slug = `unpublish-cache-${suffix}`
      const publishedName = `Published ${suffix}`
      const draftName = `Draft ${suffix}`
      const college = await payload.create({
        collection: 'colleges',
        context: FIXTURE_CONTEXT,
        data: { name: publishedName, slug, _status: 'published' },
        overrideAccess: true,
      })
      track('colleges', college.id)

      revalidatePathMock.mockClear()
      revalidateTagMock.mockClear()
      await payload.update({
        autosave: true,
        collection: 'colleges',
        data: { name: draftName, _status: 'draft' },
        draft: true,
        id: college.id,
        overrideAccess: true,
      })
      expect(revalidateTagMock).not.toHaveBeenCalled()
      expect(revalidatePathMock).not.toHaveBeenCalled()

      const [publicRow, latestVersions, publicBeforeUnpublish] = await Promise.all([
        payload.findByID({
          collection: 'colleges',
          depth: 0,
          draft: false,
          id: college.id,
          overrideAccess: true,
        }),
        payload.findVersions({
          collection: 'colleges',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          sort: '-createdAt',
          where: { parent: { equals: college.id } },
        }),
        payload.find({
          collection: 'colleges',
          depth: 0,
          draft: false,
          limit: 1,
          overrideAccess: false,
          where: { id: { equals: college.id } },
        }),
      ])
      expect(publicRow.name).toBe(publishedName)
      expect(latestVersions.docs[0]?.version.name).toBe(draftName)
      expect(publicBeforeUnpublish.totalDocs).toBe(1)

      revalidatePathMock.mockClear()
      revalidateTagMock.mockClear()

      await unpublish(college.id)

      expect(revalidateTagMock).toHaveBeenCalledWith('payload:public', { expire: 0 })
      expect(revalidatePathMock).toHaveBeenCalledWith(`/colleges/${slug}`)
      const publicAfterUnpublish = await payload.find({
        collection: 'colleges',
        depth: 0,
        draft: false,
        limit: 1,
        overrideAccess: false,
        where: { id: { equals: college.id } },
      })
      expect(publicAfterUnpublish.totalDocs).toBe(0)
    },
    60_000,
  )

  it('stores the same editor snapshot on multiple documents without array key collisions', async () => {
    const suffix = randomUUID()
    const editor = contentManagerUser()

    for (const index of [1, 2]) {
      const page = await payload.create({
        collection: 'pages',
        context: FIXTURE_CONTEXT,
        data: {
          title: `Author Snapshot ${index} ${suffix}`,
          slug: `author-snapshot-${index}-${suffix}`,
          _status: 'draft',
        },
        draft: true,
        overrideAccess: true,
        user: editor,
      })
      track('pages', page.id)
      expect(page.populatedAuthors?.[0]?.userId).toBe(String(editor.id))
    }
  }, 30_000)
})

function track(collection: TrackedCollection, id: number | string) {
  cleanup.push({ collection, id })
}

function relationshipID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

async function visibleCount(
  collection: AcademicCollection,
  id: number | string,
  user?: User,
  draft = false,
) {
  const result = await payload.find({
    collection,
    depth: 0,
    draft,
    limit: 10,
    overrideAccess: false,
    user,
    where: { id: { equals: id } },
  })
  return result.totalDocs
}

function coordinatorUser(collegeScope: number | string): User {
  return {
    id: 2_000_000_001,
    collection: 'users',
    collegeScope,
    email: 'publication-coordinator@example.test',
    isActive: true,
    roleIsActive: true,
    roleLevel: 2,
    rolePermissions: [
      'programs.manage',
      'departments.manage',
      'faculty.manage',
      'studyPlans.manage',
    ],
    roleSlug: 'coordinator',
    updatedAt: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
  } as User
}

function contentManagerUser(): User {
  return {
    id: 2_000_000_002,
    collection: 'users',
    email: 'publication-manager@example.test',
    isActive: true,
    roleIsActive: true,
    roleLevel: 3,
    roleSlug: 'content_manager',
    updatedAt: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
  } as User
}
