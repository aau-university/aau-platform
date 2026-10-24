import type { CollectionConfig } from 'payload'
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
import { Projects } from '@/collections/Projects'
import { ResearchPublications } from '@/collections/ResearchPublications'
import { StudentAffairsDocuments } from '@/collections/StudentAffairsDocuments'
import { StudyPlans } from '@/collections/StudyPlans'
import config from '@/payload.config'
import { auditVersions, editorialVersions, VERSION_POLICY } from '../versions'

/** Every collection that carries a draft workflow, so the invariants below
 *  cover the whole set rather than a sample. */
const EDITORIAL_COLLECTIONS: CollectionConfig[] = [
  AcademicDepartments,
  AcademicPrograms,
  AdmissionRequirements,
  Announcements,
  BlogPosts,
  CampusLife,
  Centers,
  Colleges,
  Events,
  FacultyMembers,
  FAQs,
  News,
  Offers,
  Pages,
  Projects,
  ResearchPublications,
  StudentAffairsDocuments,
  StudyPlans,
]

type DraftsObject = {
  autosave?: { interval?: number } | boolean
  schedulePublish?: boolean | object
}

function versionsOf(collection: CollectionConfig): { drafts?: unknown; maxPerDoc?: number } {
  const value = collection.versions
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${collection.slug} has no versions object`)
  }
  return value
}

function drafts(collection: CollectionConfig): DraftsObject {
  const value = versionsOf(collection).drafts
  if (typeof value !== 'object' || value === null) {
    throw new Error(`${collection.slug} has no drafts object`)
  }
  return value as DraftsObject
}

function autosaveInterval(collection: CollectionConfig): number | undefined {
  const autosave = drafts(collection).autosave
  return typeof autosave === 'object' && autosave !== null ? autosave.interval : undefined
}

describe('editorialVersions', () => {
  it('uses the shared 400ms autosave debounce and disables scheduling', () => {
    const versions = editorialVersions()
    expect(versions).toEqual({
      drafts: { autosave: { interval: 400 }, schedulePublish: false },
      maxPerDoc: 50,
    })
  })

  it('allows the retained version count to be overridden', () => {
    expect(editorialVersions({ maxPerDoc: 200 })).toMatchObject({ maxPerDoc: 200 })
  })
})

describe('auditVersions', () => {
  it('keys the retention limit as `max`, which is what globals accept', () => {
    // `IncomingGlobalVersions` uses `max`; `maxPerDoc` is the collection-only
    // key and Payload would silently ignore it here.
    expect(auditVersions()).toEqual({ max: VERSION_POLICY.MAX_VERSIONS_PER_GLOBAL })
    expect(auditVersions(5)).toEqual({ max: 5 })
  })

  it('enables no draft workflow, so it adds no `_status` field', () => {
    expect(auditVersions()).not.toHaveProperty('drafts')
  })
})

describe('version policy across the real collections', () => {
  it('routes every editorial collection through the factory', () => {
    for (const collection of EDITORIAL_COLLECTIONS) {
      expect(autosaveInterval(collection), `${collection.slug} autosave interval`).toBe(
        VERSION_POLICY.EDITORIAL_AUTOSAVE_INTERVAL_MS,
      )
      expect(versionsOf(collection).maxPerDoc, `${collection.slug} maxPerDoc`).toBe(
        VERSION_POLICY.MAX_VERSIONS_PER_DOC,
      )
    }
  })

  it('keeps scheduled publishing disabled without a jobs worker', () => {
    for (const collection of EDITORIAL_COLLECTIONS) {
      expect(drafts(collection).schedulePublish, `${collection.slug} schedulePublish`).toBe(false)
    }
  })

  it('does not register a Payload jobs queue', async () => {
    expect((await config).jobs.enabled).toBe(false)
  })
})
