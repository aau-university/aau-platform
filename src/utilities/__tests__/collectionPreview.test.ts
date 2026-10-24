import type { CollectionConfig } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AcademicPrograms } from '@/collections/AcademicPrograms'
import { BlogPosts } from '@/collections/BlogPosts'
import { CampusLife } from '@/collections/CampusLife'
import { Centers } from '@/collections/Centers'
import { Colleges } from '@/collections/Colleges'
import { Events } from '@/collections/Events'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { News } from '@/collections/News'
import { Offers } from '@/collections/Offers'
import { Pages } from '@/collections/Pages'
import { Projects } from '@/collections/Projects'
import { ResearchPublications } from '@/collections/ResearchPublications'
import { StudyPlans } from '@/collections/StudyPlans'
import { collectionPreview } from '../generatePreviewPath'

const { createSessionMock } = vi.hoisted(() => ({ createSessionMock: vi.fn() }))
vi.mock('@/lib/payload/preview-session', () => ({
  PREVIEW_SESSION_QUERY: 'previewSession',
  createOrReusePreviewSession: createSessionMock,
}))

/** A document exactly as Payload hands it to the preview callbacks. */
const doc = { id: 7, slug: 'ai-lab', title: 'AI Lab', _status: 'draft' }

/**
 * `admin.preview` is `GeneratePreviewURL = (doc, options) => …`, so calling it
 * requires the second argument. The values are irrelevant to path building.
 */
const request = {
  locale: 'ar',
  payload: { findByID: vi.fn(), logger: { error: vi.fn() } },
  user: { id: 19, _sid: 'login-session-1' },
} as never
const previewOptions = { locale: 'ar', req: request, token: null }

function callPreview(collection: CollectionConfig, document: Record<string, unknown>): unknown {
  const preview = collection.admin?.preview
  if (typeof preview !== 'function') throw new Error(`${collection.slug} has no admin.preview`)
  return preview(document, previewOptions)
}

describe('collectionPreview', () => {
  beforeEach(() => createSessionMock.mockResolvedValue('opaque-token'))

  it('handles the two different callback signatures identically', async () => {
    // The regression this pins: `preview` receives the document as its FIRST
    // POSITIONAL argument, while `livePreview.url` receives it under `data`.
    // Every collection that wired preview by hand used `({ data }) => …` for
    // both, so on the `preview` side `data` was `undefined` and the path
    // builder threw `TypeError: Cannot read properties of undefined (reading
    // 'path')` as soon as an editor clicked Preview.
    const { preview, livePreview } = collectionPreview('projects')

    const fromPreview = await (preview as (d: unknown, o: unknown) => Promise<string>)(doc, previewOptions)
    const fromLive = await (livePreview!.url as (a: unknown) => Promise<string>)({ data: doc, req: request })

    for (const url of [fromPreview, fromLive]) {
      expect(url).toBe('/next/preview?previewSession=opaque-token')
    }
    expect(createSessionMock).toHaveBeenCalledTimes(2)
  })

  it('does not trust an explicit `path` on the document', async () => {
    const { preview } = collectionPreview('academic-programs')
    const withPath = { ...doc, path: '/colleges/medicine/programs/ai-lab' }

    const result = await (preview as (d: unknown, o: unknown) => Promise<string | null>)(withPath, previewOptions)
    expect(result).toBeNull()
  })
})

describe('preview wiring across the real collections', () => {
  const wired: CollectionConfig[] = [
    AcademicPrograms,
    BlogPosts,
    CampusLife,
    Centers,
    Colleges,
    Events,
    FacultyMembers,
    News,
    Offers,
    Pages,
    Projects,
    ResearchPublications,
    StudyPlans,
  ]

  it('wires both entry points on every previewable collection', () => {
    for (const collection of wired) {
      expect(typeof collection.admin?.preview, `${collection.slug} admin.preview`).toBe('function')
      expect(
        typeof collection.admin?.livePreview?.url,
        `${collection.slug} livePreview.url`,
      ).toBe('function')
    }
  })

  it('never throws on a routable document, and both entry points agree', async () => {
    // Calling the real configs is what catches a signature mistake: a unit
    // test of the factory alone would still pass if a collection went back to
    // hand-wiring its own callbacks.
    for (const collection of wired) {
      const routedDoc = collection.slug === 'academic-programs'
        ? { ...doc, college: { id: 2, slug: 'engineering' } }
        : collection.slug === 'study-plans'
          ? { ...doc, college: { id: 2, slug: 'engineering' }, academicProgram: { id: 3, slug: 'software' } }
          : doc
      const fromPreview = await callPreview(collection, routedDoc)
      const fromLive = await (collection.admin?.livePreview?.url as (args: unknown) => Promise<unknown>)({ data: routedDoc, req: request })

      expect(typeof fromPreview, `${collection.slug} preview return type`).toBe('string')
      expect(fromPreview as string).toContain('previewSession=')
      for (const url of [fromPreview, fromLive]) {
        expect(url, `${collection.slug} Preview URL`).toBe('/next/preview?previewSession=opaque-token')
      }
    }
  })

  it('returns null for a document that has not been created', async () => {
    for (const collection of wired) {
      await expect(callPreview(collection, { slug: 'unsaved' })).resolves.toBeNull()
    }
  })
})
