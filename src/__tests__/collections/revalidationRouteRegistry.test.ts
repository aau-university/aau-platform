/**
 * Exercises the exported collection hooks so the route registry is verified
 * through the same wrappers Payload invokes at runtime.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()
const payloadFindMock = vi.fn()
const payloadCreateMock = vi.fn()
const payloadDeleteMock = vi.fn()
const payloadUpdateMock = vi.fn()
const loggerErrorMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

import { revalidateNews } from '@/collections/News/hooks/revalidate'
import { revalidateEvent } from '@/collections/Events/hooks/revalidate'
import { revalidateBlogPost } from '@/collections/BlogPosts/hooks/revalidate'
import { revalidateCenters } from '@/collections/Centers/hooks/revalidate'
import { revalidateCampusLife } from '@/collections/CampusLife/hooks/revalidate'
import { revalidateProjects } from '@/collections/Projects/hooks/revalidate'
import { revalidateResearchPublications } from '@/collections/ResearchPublications/hooks/revalidate'
import { revalidateOffers } from '@/collections/Offers/hooks/revalidate'
import { revalidateFacultyMember } from '@/collections/FacultyMembers/hooks/revalidate'
import { revalidatePartners } from '@/collections/Partners/hooks/revalidate'
import { revalidateProgram } from '@/collections/AcademicPrograms/hooks/revalidate'
import { revalidateStudyPlan } from '@/collections/StudyPlans/hooks/revalidate'

type HookFn = (args: unknown) => unknown

async function runSlugRename(
  hook: HookFn,
  doc: Record<string, unknown> = {},
  previousDoc: Record<string, unknown> = {},
): Promise<void> {
  await hook({
    doc: { id: 1, slug: 'new-slug', _status: 'published', ...doc },
    previousDoc: {
      id: 1,
      slug: 'old-slug',
      _status: 'published',
      ...previousDoc,
    },
    context: {},
    operation: 'update',
    req: {
      payload: {
        create: payloadCreateMock,
        delete: payloadDeleteMock,
        find: payloadFindMock,
        findByID: vi.fn(),
        logger: { error: loggerErrorMock },
        update: payloadUpdateMock,
      },
    },
  })
}

describe('per-collection route-registry wiring', () => {
  beforeEach(() => {
    revalidateTagMock.mockClear()
    revalidatePathMock.mockClear()
    payloadFindMock.mockReset().mockResolvedValue({ docs: [] })
    payloadCreateMock.mockReset()
    payloadDeleteMock.mockReset()
    payloadUpdateMock.mockReset()
    loggerErrorMock.mockReset()
  })

  const cases: Array<{ name: string; hook: HookFn; expectedPath: string | null }> = [
    { name: 'news', hook: revalidateNews as HookFn, expectedPath: '/news/old-slug' },
    { name: 'events', hook: revalidateEvent as HookFn, expectedPath: '/events/old-slug' },
    { name: 'blog-posts', hook: revalidateBlogPost as HookFn, expectedPath: '/blog/old-slug' },
    { name: 'centers', hook: revalidateCenters as HookFn, expectedPath: '/centers/old-slug' },
    { name: 'campus-life', hook: revalidateCampusLife as HookFn, expectedPath: '/campus-life/old-slug' },
    { name: 'projects', hook: revalidateProjects as HookFn, expectedPath: '/projects-studio/old-slug' },
    { name: 'research-publications', hook: revalidateResearchPublications as HookFn, expectedPath: '/research/articles/old-slug' },
    { name: 'offers', hook: revalidateOffers as HookFn, expectedPath: '/offers/old-slug' },
    { name: 'faculty-members', hook: revalidateFacultyMember as HookFn, expectedPath: '/faculty/old-slug' },
    { name: 'partners', hook: revalidatePartners as HookFn, expectedPath: null },
  ]

  for (const { name, hook, expectedPath } of cases) {
    it(`${name} revalidates ${expectedPath ?? '(no path — skipped)'} on slug rename`, async () => {
      await runSlugRename(hook)
      if (expectedPath === null) {
        expect(revalidatePathMock).not.toHaveBeenCalled()
      } else {
        expect(revalidatePathMock).toHaveBeenCalledWith(expectedPath)
      }
      expect(revalidateTagMock).toHaveBeenCalled()
    })
  }

  it('resolves the AcademicPrograms wrapper through its college relation', async () => {
    await runSlugRename(
      revalidateProgram as HookFn,
      { college: { slug: 'engineering' } },
      { college: { slug: 'engineering' } },
    )
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/colleges/engineering/programs/old-slug',
    )
  })

  it('resolves the StudyPlans wrapper through college and program relations', async () => {
    const relations = {
      college: { slug: 'engineering' },
      academicProgram: { slug: 'software' },
    }
    await runSlugRename(revalidateStudyPlan as HookFn, relations, relations)
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/colleges/engineering/programs/software/study-plan',
    )
  })
})
