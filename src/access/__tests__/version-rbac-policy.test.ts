import type { Access, CollectionConfig, Field, GlobalConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { AcademicPrograms } from '@/collections/AcademicPrograms'
import { AdmissionRequirements } from '@/collections/AdmissionRequirements'
import { Announcements } from '@/collections/Announcements'
import { BlogPosts } from '@/collections/BlogPosts'
import { CampusLife } from '@/collections/CampusLife'
import { Centers } from '@/collections/Centers'
import { Colleges } from '@/collections/Colleges'
import { Events } from '@/collections/Events'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { FAQs } from '@/collections/FAQs'
import { News } from '@/collections/News'
import { Offers } from '@/collections/Offers'
import { Pages } from '@/collections/Pages'
import { Partners } from '@/collections/Partners'
import { Projects } from '@/collections/Projects'
import { ResearchPublications } from '@/collections/ResearchPublications'
import { Sliders } from '@/collections/Sliders'
import { StudentAffairsDocuments } from '@/collections/StudentAffairsDocuments'
import { StudyPlans } from '@/collections/StudyPlans'
import { AboutPage } from '@/globals/AboutPage'
import { ContactSettings } from '@/globals/ContactSettings'
import { FooterSettings } from '@/globals/FooterSettings'
import { NavbarSettings } from '@/globals/NavbarSettings'
import { SiteSettings } from '@/globals/SiteSettings'

type AccessArgs = Parameters<Access>[0]

const contentManager = {
  id: 10,
  isActive: true,
  role: { slug: 'content_manager', isActive: true },
}

function coordinator(
  permission: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 20,
    isActive: true,
    role: {
      slug: 'coordinator',
      isActive: true,
      permissions: [{ key: permission }],
    },
    collegeScope: { id: 41 },
    ...overrides,
  }
}

function args(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

async function run(access: Access | undefined, user: unknown) {
  expect(access).toBeTypeOf('function')
  return access?.(args(user))
}

const unscopedCollections: CollectionConfig[] = [
  AdmissionRequirements,
  BlogPosts,
  CampusLife,
  Centers,
  FAQs,
  Offers,
  Pages,
  Projects,
  ResearchPublications,
  StudentAffairsDocuments,
]

const scopedCollections: Array<{
  collection: CollectionConfig
  permission: string
  expectedPath: 'parent' | 'version.college'
}> = [
  { collection: Colleges, permission: 'colleges.manage', expectedPath: 'parent' },
  {
    collection: AcademicDepartments,
    permission: 'departments.manage',
    expectedPath: 'version.college',
  },
  {
    collection: AcademicPrograms,
    permission: 'programs.manage',
    expectedPath: 'version.college',
  },
  {
    collection: Announcements,
    permission: 'announcements.manage',
    expectedPath: 'version.college',
  },
  { collection: Events, permission: 'events.manage', expectedPath: 'version.college' },
  {
    collection: FacultyMembers,
    permission: 'faculty.manage',
    expectedPath: 'version.college',
  },
  { collection: News, permission: 'news.manage', expectedPath: 'version.college' },
  {
    collection: StudyPlans,
    permission: 'studyPlans.manage',
    expectedPath: 'version.college',
  },
]

const versionedGlobals: GlobalConfig[] = [
  AboutPage,
  ContactSettings,
  FooterSettings,
  NavbarSettings,
  SiteSettings,
]

function namedField(collection: CollectionConfig, name: string): Field | undefined {
  return collection.fields.find((field) => 'name' in field && field.name === name)
}

describe('shared version access policy contract', () => {
  it('declares readVersions on all 18 versioned collections and all 5 globals', () => {
    const collections = [...unscopedCollections, ...scopedCollections.map(({ collection }) => collection)]

    expect(collections).toHaveLength(18)
    expect(versionedGlobals).toHaveLength(5)
    for (const entity of [...collections, ...versionedGlobals]) {
      expect(entity.access?.readVersions, entity.slug).toBeTypeOf('function')
    }
  })

  it('limits university-wide histories to active Content Manager+ users', async () => {
    const coordinatorUser = coordinator('pages.manage')
    const inactiveManager = { ...contentManager, isActive: false }
    const inactiveRoleManager = {
      ...contentManager,
      role: { ...contentManager.role, isActive: false },
    }

    for (const collection of unscopedCollections) {
      const access = collection.access?.readVersions
      await expect(run(access, null), collection.slug).resolves.toBe(false)
      await expect(run(access, coordinatorUser), collection.slug).resolves.toBe(false)
      await expect(run(access, inactiveManager), collection.slug).resolves.toBe(false)
      await expect(run(access, inactiveRoleManager), collection.slug).resolves.toBe(false)
      await expect(run(access, contentManager), collection.slug).resolves.toBe(true)
    }

    for (const global of versionedGlobals) {
      await expect(run(global.access?.readVersions, coordinatorUser), global.slug).resolves.toBe(
        false,
      )
      await expect(run(global.access?.readVersions, contentManager), global.slug).resolves.toBe(
        true,
      )
    }
  })

  it('returns version-row Where constraints for a permitted Coordinator', async () => {
    for (const { collection, expectedPath, permission } of scopedCollections) {
      await expect(
        run(collection.access?.readVersions, coordinator(permission)),
        collection.slug,
      ).resolves.toEqual({
        [expectedPath]: { equals: 41 },
      })
    }
  })

  it('fails closed for missing permission, scope, inactive user, and inactive role', async () => {
    for (const { collection, permission } of scopedCollections) {
      const access = collection.access?.readVersions
      await expect(run(access, coordinator('other.manage')), collection.slug).resolves.toBe(false)
      await expect(
        run(access, coordinator(permission, { collegeScope: undefined })),
        collection.slug,
      ).resolves.toBe(false)
      await expect(
        run(access, coordinator(permission, { isActive: false })),
        collection.slug,
      ).resolves.toBe(false)
      await expect(
        run(
          access,
          coordinator(permission, {
            role: {
              slug: 'coordinator',
              isActive: false,
              permissions: [{ key: permission }],
            },
          }),
        ),
        collection.slug,
      ).resolves.toBe(false)
      await expect(run(access, contentManager), collection.slug).resolves.toBe(true)
    }
  })
})

describe('Content Manager and College publication policy', () => {
  it('allows Content Manager to create/delete Colleges and update its slug', async () => {
    await expect(run(Colleges.access?.create, contentManager)).resolves.toBe(true)
    await expect(run(Colleges.access?.delete, contentManager)).resolves.toBe(true)

    const slug = namedField(Colleges, 'slug')
    expect(slug && 'access' in slug ? slug.access?.update?.(args(contentManager)) : false).toBe(true)
  })

  it('keeps Coordinator create/delete/slug denied while update targets only their College', async () => {
    const user = coordinator('colleges.manage')

    await expect(run(Colleges.access?.create, user)).resolves.toBe(false)
    await expect(run(Colleges.access?.delete, user)).resolves.toBe(false)
    await expect(run(Colleges.access?.update, user)).resolves.toEqual({
      id: { equals: 41 },
    })

    const slug = namedField(Colleges, 'slug')
    expect(slug && 'access' in slug ? slug.access?.update?.(args(user)) : true).toBe(false)
  })

  it('aligns Payload Admin publish controls with server update permission', async () => {
    const user = coordinator('colleges.manage')

    // Payload's document permissions use collection update access for the
    // Publish, Unpublish, and Schedule controls. A truthy scoped result here,
    // paired with the level-2 publication hook, means the visible controls and
    // the server action agree for the Coordinator's own document.
    await expect(run(Colleges.access?.update, user)).resolves.toEqual({
      id: { equals: 41 },
    })
    expect(Colleges.hooks?.beforeChange).toEqual([expect.any(Function)])
  })

  it('allows Content Manager to toggle public visibility for Partners and Sliders', () => {
    for (const collection of [Partners, Sliders]) {
      const isActive = namedField(collection, 'isActive')
      expect(
        isActive && 'access' in isActive
          ? isActive.access?.update?.(args(contentManager))
          : false,
        collection.slug,
      ).toBe(true)
    }
  })

  it('removes the unused Offers isActive field in favor of _status', () => {
    expect(namedField(Offers, 'isActive')).toBeUndefined()
    expect(Offers.versions).toBeTruthy()
  })
})
