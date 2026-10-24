import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { homepageBlocks } from '@/blocks'
import { Pages } from '@/collections/Pages'
import config from '@/payload.config'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

async function importWorkspaceModule(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath)
  return import(pathToFileURL(absolutePath).href)
}

describe('Phase 1.5 Sprint 1 foundation', () => {
  it('registers Sprint 1 collections in payload config and SEO wiring', async () => {
    const resolved = await config
    const slugs = resolved.collections?.map((collection) => collection.slug) ?? []

    expect(slugs).toContain('events')
    expect(slugs).toContain('blog-posts')
    expect(slugs).toContain('faqs')

    // PR-010 moved all plugin configs (including the SEO plugin's
    // `collections: ['pages', 'news', ...]` array) out of `payload.config.ts`
    // into `src/plugins/index.ts`. These source-text assertions verify the
    // SEO plugin is still wired with the Sprint 1 collections — they now read
    // the plugins module instead of the root config.
    const pluginsSource = readFileSync(path.join(repoRoot, 'src/plugins/index.ts'), 'utf8')
    expect(pluginsSource).toMatch(/collections:\s*\[[^\]]*'events'[^\]]*\]/)
    expect(pluginsSource).toMatch(/collections:\s*\[[^\]]*'blog-posts'[^\]]*\]/)
  })

  it('loads Sprint 1 collection modules with the expected access foundations', async () => {
    // PR-011 folderized Events / BlogPosts / FAQs from flat `.ts` files to
    // `<Name>/index.ts` (with per-collection `hooks/revalidate.ts`). These
    // assertions now point at the new folder-shaped entry points.
    for (const relativePath of [
      'src/collections/Events/index.ts',
      'src/collections/BlogPosts/index.ts',
      'src/collections/FAQs/index.ts',
    ]) {
      expect(existsSync(path.join(repoRoot, relativePath)), `${relativePath} should exist`).toBe(true)
    }

    const [{ Events }, { BlogPosts }, { FAQs }] = await Promise.all([
      importWorkspaceModule('src/collections/Events/index.ts'),
      importWorkspaceModule('src/collections/BlogPosts/index.ts'),
      importWorkspaceModule('src/collections/FAQs/index.ts'),
    ])

    expect(Events.slug).toBe('events')
    expect(BlogPosts.slug).toBe('blog-posts')
    expect(FAQs.slug).toBe('faqs')

    for (const collection of [Events, BlogPosts, FAQs]) {
      expect(collection.access).toMatchObject({
        create: expect.any(Function),
        read: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
      })
    }

    const eventSlugField = Events.fields.find(
      (field: { name?: string }) => field.name === 'slug',
    ) as { required?: boolean; unique?: boolean; index?: boolean } | undefined

    expect(eventSlugField).toMatchObject({
      required: true,
      unique: true,
      index: true,
    })
    // Events has no `publishedAt` field, so only coordinator-scope
    // enforcement belongs in `beforeChange`.
    expect(Events.hooks?.beforeChange).toEqual([expect.any(Function)])
  })

  it('wires Sprint 1 blocks into homepageBlocks and the Pages layout', () => {
    expect(homepageBlocks.map((block) => block.slug)).toContain('eventsGrid')
    expect(homepageBlocks.map((block) => block.slug)).toContain('blogGrid')
    expect(homepageBlocks.map((block) => block.slug)).toContain('faq')

    const layout = Pages.fields.find((field) => 'name' in field && field.name === 'layout')
    expect(layout).toBeTruthy()
    if (!layout || !('blocks' in layout)) throw new Error('layout blocks field missing')

    expect(layout.blocks.map((block) => block.slug)).toContain('eventsGrid')
    expect(layout.blocks.map((block) => block.slug)).toContain('blogGrid')
    expect(layout.blocks.map((block) => block.slug)).toContain('faq')
  })

  it('exposes reusable public loader helpers for Sprint 1 collection loaders', async () => {
    const queryHelpersPath = path.join(repoRoot, 'src/lib/payload/query-helpers.ts')
    const resolveMediaPath = path.join(repoRoot, 'src/lib/payload/resolve-media.ts')

    expect(existsSync(queryHelpersPath), 'query-helpers.ts should exist').toBe(true)
    expect(existsSync(resolveMediaPath), 'resolve-media.ts should exist').toBe(true)

    const queryHelpers = await importWorkspaceModule('src/lib/payload/query-helpers.ts')
    const resolveMedia = await importWorkspaceModule('src/lib/payload/resolve-media.ts')

    expect(queryHelpers.clampCollectionLimit(99)).toBe(8)
    expect(queryHelpers.clampCollectionLimit(0)).toBe(1)
    // `buildPublishedWhere('isPublished')` filtered the hand-rolled boolean
    // that Issue #34 removed from the editorial collections; it had no callers
    // left, so a loader reaching for the obvious-sounding helper would have
    // queried a column that no longer exists. `PUBLISHED_WHERE` targets the
    // `_status` field Payload's draft workflow actually maintains, and
    // `buildActiveWhere` remains for the non-editorial list collections.
    expect(queryHelpers.PUBLISHED_WHERE).toEqual({
      _status: { equals: 'published' },
    })
    expect(queryHelpers.publishedRelation('college')).toEqual({
      'college._status': { equals: 'published' },
    })
    expect(queryHelpers.buildActiveWhere()).toEqual({
      isActive: { equals: true },
    })
    expect(queryHelpers.buildPublicQueryOptions({ limit: 6, locale: 'en' })).toMatchObject({
      depth: 0,
      limit: 6,
      locale: 'en',
      overrideAccess: false,
    })

    expect(resolveMedia.resolveMediaUrl('https://cdn.example.test/image.jpg')).toBe(
      'https://cdn.example.test/image.jpg',
    )
    expect(resolveMedia.resolveMediaUrl({ url: '/media/example.jpg' })).toBe('/media/example.jpg')
    expect(resolveMedia.resolveMediaUrl({ id: 123 })).toBeUndefined()
  })
})
