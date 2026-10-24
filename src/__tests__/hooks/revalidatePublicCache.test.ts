/**
 * Tests for `revalidatePublicCache` — the cross-cutting hook factory used by
 * every editorial collection's per-collection `hooks/revalidate.ts`.
 *
 * Behaviors covered:
 *   1. `context.disableRevalidate = true` short-circuits the hook (no
 *      `revalidateTag` / `revalidatePath` calls) — used by seeders,
 *      importers, and migrations to bypass cache invalidation. (PR-011)
 *   2. Immediate tag expiration — collection, page, and sitemap tags use
 *      `{ expire: 0 }`, so the first public read after a CMS mutation cannot
 *      receive a stale-while-revalidate response.
 *      called alongside the existing `payload:public` /
 *      `payload:collection:<slug>` tags so sitemap XML is regenerated. (PR-011)
 *   3. Route-registry path handling — current, previous, nested, and deleted
 *      document paths are resolved from the same registry as preview.
 *   4. Draft-autosave guard — `afterChange` skips revalidation
 *      for draft→draft autosaves. Revalidation
 *      still fires on publish (draft→published), unpublish
 *      (published→draft, to clean the old URL), and published-doc updates.
 *   5. Collections without a detail route never invent one.
 *
 * `next/cache` is mocked so the tests don't depend on a running Next.js
 * server. The factory dynamically imports `next/cache` inside a try/catch;
 * vitest's `vi.mock` intercepts both static and dynamic imports.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()
const findByIDMock = vi.fn()
const findOneMock = vi.fn()
const findMock = vi.fn()
const loggerErrorMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

import {
  capturePublicUnpublish,
  revalidatePublicCollection,
  withPublicUnpublishCapture,
} from '@/hooks/revalidatePublicCache'

type HookArgs = {
  doc?: Record<string, unknown>
  previousDoc?: Record<string, unknown>
  context?: Record<string, unknown>
}

async function runAfterChange(slug: string, args: HookArgs): Promise<void> {
  const { afterChange } = revalidatePublicCollection(slug)
  await (afterChange as unknown as (a: unknown) => Promise<unknown>)({
    doc: args.doc ?? {},
    previousDoc: args.previousDoc,
    context: args.context ?? {},
    operation: args.previousDoc ? 'update' : 'create',
    req: {
      id: 'request-123',
      payload: {
        findByID: findByIDMock,
        logger: { error: loggerErrorMock },
      },
    },
  })
}

async function runAfterDelete(slug: string, args: HookArgs): Promise<void> {
  const { afterDelete } = revalidatePublicCollection(slug)
  await (afterDelete as unknown as (a: unknown) => Promise<unknown>)({
    doc: args.doc ?? {},
    context: args.context ?? {},
    req: {
      id: 'request-123',
      payload: {
        findByID: findByIDMock,
        logger: { error: loggerErrorMock },
      },
    },
  })
}

describe('withPublicUnpublishCapture', () => {
  it.each(['users', 'roles', 'media'])(
    'does not attach publication snapshot hooks to %s',
    (slug) => {
      const collection = { slug, fields: [] } as never

      expect(withPublicUnpublishCapture(collection)).toBe(collection)
    },
  )

  it('attaches snapshot hooks to a draft-enabled editorial collection', () => {
    const collection = {
      slug: 'news',
      fields: [],
      versions: { drafts: true },
    } as never

    const wrapped = withPublicUnpublishCapture(collection)

    expect(wrapped).not.toBe(collection)
    expect(wrapped.hooks?.beforeOperation).toContain(capturePublicUnpublish)
  })
})

describe('revalidatePublicCache', () => {
  beforeEach(() => {
    revalidateTagMock.mockClear()
    revalidatePathMock.mockClear()
    findByIDMock.mockReset()
    findOneMock.mockReset()
    findMock.mockReset()
    loggerErrorMock.mockReset()
  })

  // ── context.disableRevalidate short-circuit ────────────────────────────
  it('short-circuits afterChange when context.disableRevalidate is true', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'about' },
      context: { disableRevalidate: true },
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('short-circuits afterDelete when context.disableRevalidate is true', async () => {
    await runAfterDelete('pages', {
      doc: { id: 1, slug: 'about' },
      context: { disableRevalidate: true },
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('still revalidates when context.disableRevalidate is falsey', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'about' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
  })

  // ── Sitemap tag bust ───────────────────────────────────────────────────
  it('busts the <slug>-sitemap tag on afterChange', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'about' },
      context: {},
    })
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('pages-sitemap')
    expect(revalidateTagMock).toHaveBeenCalledWith('pages-sitemap', { expire: 0 })
  })

  it('busts the <slug>-sitemap tag on afterDelete', async () => {
    await runAfterDelete('news', {
      doc: { id: 1, slug: 'some-news' },
      context: {},
    })
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('news-sitemap')
    expect(revalidateTagMock).toHaveBeenCalledWith('news-sitemap', { expire: 0 })
  })

  it('immediately expires every public tag after a CMS mutation', async () => {
    await runAfterChange('faqs', {
      doc: { id: 1, slug: 'question', _status: 'published' },
      previousDoc: { id: 1, slug: 'question', _status: 'draft' },
      context: {},
    })

    expect(revalidateTagMock).toHaveBeenCalled()
    for (const [, profile] of revalidateTagMock.mock.calls) {
      expect(profile).toEqual({ expire: 0 })
    }
  })

  // ── Route-registry path handling ──────────────────────────────────────
  it('revalidates the old and current page paths on slug rename', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'new-slug' },
      previousDoc: { id: 1, slug: 'old-slug' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/old-slug')
    expect(revalidatePathMock).toHaveBeenCalledWith('/new-slug')
  })

  it('deduplicates an unchanged current and previous path', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'same-slug' },
      previousDoc: { id: 1, slug: 'same-slug' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/same-slug')
  })

  it('revalidates the current path on create', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'fresh-page' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/fresh-page')
  })

  // ── Draft-autosave guard ───────────────────────────────────────────────
  // The guard skips revalidation
  // for draft→draft autosaves but still fires on publish / unpublish /
  // published-doc updates.
  it('skips revalidation on draft autosave (draft→draft)', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'draft' },
      previousDoc: { id: 1, slug: 'my-news', _status: 'draft' },
      context: {},
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('skips revalidation on draft create (no previousDoc, _status: draft)', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'draft' },
      context: {},
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('revalidates on publish transition (draft→published)', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'published' },
      previousDoc: { id: 1, slug: 'my-news', _status: 'draft' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('payload:public')
    expect(tags).toContain('payload:collection:news')
  })

  it('revalidates on unpublish transition (published→draft) to clean the old URL', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'draft' },
      previousDoc: { id: 1, slug: 'my-news', _status: 'published' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
  })

  it.each([true, 'true'] as const)(
    'uses the captured published row when a draft autosave is latest before unpublish (%s)',
    async (unpublishAllLocales) => {
      const context: Record<string, unknown> = {}
      findOneMock.mockResolvedValue({
        id: 1,
        slug: 'published-slug',
        _status: 'published',
      })

      await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
        args: { id: 1, unpublishAllLocales },
        collection: { slug: 'news' },
        context,
        operation: 'update',
        req: {
          id: 'request-123',
          payload: {
            db: { findOne: findOneMock },
            logger: { error: loggerErrorMock },
          },
        },
      })

      await runAfterChange('news', {
        doc: { id: 1, slug: 'draft-slug', _status: 'draft' },
        previousDoc: { id: 1, slug: 'draft-slug', _status: 'draft' },
        context,
      })

      expect(revalidateTagMock).toHaveBeenCalled()
      expect(revalidatePathMock).toHaveBeenCalledWith('/news/published-slug')
      expect(revalidatePathMock).not.toHaveBeenCalledWith('/news/draft-slug')
    },
  )

  it('captures the persisted public row for a direct status unpublish after autosave', async () => {
    const context: Record<string, unknown> = {}
    findOneMock.mockResolvedValue({
      id: 1,
      slug: 'published-slug',
      _status: 'published',
    })

    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        id: 1,
        data: { _status: 'draft' },
        draft: false,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req: {
        id: 'request-123',
        payload: {
          db: { findOne: findOneMock },
          logger: { error: loggerErrorMock },
        },
      },
    })

    await runAfterChange('news', {
      doc: { id: 1, slug: 'draft-slug', _status: 'draft' },
      previousDoc: { id: 1, slug: 'draft-slug', _status: 'draft' },
      context,
    })

    expect(findOneMock).toHaveBeenCalledOnce()
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/published-slug')
  })

  it('does not read the main row for an autosave draft-only operation', async () => {
    const context: Record<string, unknown> = {}
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        id: 1,
        data: { _status: 'draft', title: 'Draft title' },
        draft: true,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req: {
        id: 'request-123',
        payload: {
          db: { findOne: findOneMock },
          logger: { error: loggerErrorMock },
        },
      },
    })

    expect(findOneMock).not.toHaveBeenCalled()

    await runAfterChange('news', {
      doc: { id: 1, slug: 'draft-slug', _status: 'draft' },
      // Payload 3.86 reports the public main row here when the autosave is
      // the first newer draft over a published document.
      previousDoc: { id: 1, slug: 'published-slug', _status: 'published' },
      context,
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('consumes a per-document autosave marker before a same-context publish', async () => {
    const context: Record<string, unknown> = {}
    const req = {
      id: 'request-123',
      payload: {
        db: { findOne: findOneMock },
        logger: { error: loggerErrorMock },
      },
    }

    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        id: 1,
        data: { _status: 'draft', title: 'Draft title' },
        draft: true,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      doc: { id: 1, slug: 'same-context', _status: 'draft' },
      previousDoc: { id: 1, slug: 'same-context', _status: 'published' },
      context,
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()

    findOneMock.mockResolvedValue({ id: 1, slug: 'same-context', _status: 'published' })
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        id: 1,
        data: { _status: 'published' },
        draft: false,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      doc: { id: 1, slug: 'same-context', _status: 'published' },
      previousDoc: { id: 1, slug: 'same-context', _status: 'draft' },
      context,
    })

    expect(revalidateTagMock).toHaveBeenCalledWith('payload:public', { expire: 0 })
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/same-context')
  })

  it('does not retain a consumed public snapshot across same-context unpublish and republish', async () => {
    const context: Record<string, unknown> = {}
    const req = {
      id: 'request-123',
      payload: {
        db: { findOne: findOneMock },
        logger: { error: loggerErrorMock },
      },
    }

    findOneMock.mockResolvedValue({ id: 1, slug: 'old-route', _status: 'published' })
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: { id: 1, data: { _status: 'draft' }, draft: false },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'old-route', _status: 'draft' },
      previousDoc: { id: 1, slug: 'latest-autosave', _status: 'draft' },
    })
    expect(context).not.toHaveProperty('__publicRowSnapshots.news.1')

    revalidatePathMock.mockClear()
    findOneMock.mockResolvedValue({ id: 1, slug: 'old-route', _status: 'draft' })
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: { id: 1, data: { _status: 'published', slug: 'new-route' }, draft: false },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'new-route', _status: 'published' },
      previousDoc: { id: 1, slug: 'old-route', _status: 'draft' },
    })

    expect(revalidatePathMock).toHaveBeenCalledWith('/news/new-route')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/news/old-route')
  })

  it('does not create or retain version-only markers for disabled or retried operations', async () => {
    const context: Record<string, unknown> = { disableRevalidate: true }
    const req = {
      id: 'request-123',
      payload: {
        db: { findOne: findOneMock },
        logger: { error: loggerErrorMock },
      },
    }

    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        id: 1,
        data: { _status: 'draft' },
        draft: true,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'disabled', _status: 'draft' },
      previousDoc: { id: 1, slug: 'disabled', _status: 'published' },
    })
    expect(context).not.toHaveProperty('__publicVersionOnlyUpdates')
    expect(findOneMock).not.toHaveBeenCalled()

    delete context.disableRevalidate
    // Simulate an autosave that fails after beforeOperation, so afterChange
    // never gets the opportunity to consume its marker.
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        id: 1,
        data: { _status: 'draft' },
        draft: true,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    expect(context).toHaveProperty('__publicVersionOnlyUpdates.news.1', true)

    findOneMock.mockResolvedValue({ id: 1, slug: 'retry-route', _status: 'published' })
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: { id: 1, data: { _status: 'published' }, draft: false },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req,
    })
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'retry-route', _status: 'published' },
      previousDoc: { id: 1, slug: 'retry-route', _status: 'draft' },
    })

    expect(context).not.toHaveProperty('__publicVersionOnlyUpdates')
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/retry-route')
  })

  it('consumes an existing version-only marker before a disabled afterChange returns', async () => {
    const context: Record<string, unknown> = {}
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        id: 1,
        data: { _status: 'draft' },
        draft: true,
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req: {
        id: 'request-123',
        payload: {
          db: { findOne: findOneMock },
          logger: { error: loggerErrorMock },
        },
      },
    })
    expect(context).toHaveProperty('__publicVersionOnlyUpdates.news.1', true)

    context.disableRevalidate = true
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'disabled-after-change', _status: 'draft' },
      previousDoc: { id: 1, slug: 'disabled-after-change', _status: 'published' },
    })

    expect(context).not.toHaveProperty('__publicVersionOnlyUpdates')
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('does not allocate a version-only marker store during an ordinary change', async () => {
    const context: Record<string, unknown> = {}
    await runAfterChange('news', {
      context,
      doc: { id: 1, slug: 'ordinary', _status: 'published' },
      previousDoc: { id: 1, slug: 'ordinary', _status: 'published' },
    })

    expect(context).not.toHaveProperty('__publicVersionOnlyUpdates')
  })

  it('consumes every bulk marker without suppressing a later publish', async () => {
    const context: Record<string, unknown> = {}
    findMock.mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }] })
    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        autosave: true,
        data: { _status: 'draft' },
        draft: true,
        where: { id: { in: [1, 2] } },
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req: {
        id: 'request-123',
        payload: {
          db: { find: findMock, findOne: findOneMock },
          logger: { error: loggerErrorMock },
        },
      },
    })

    for (const id of [1, 2]) {
      await runAfterChange('news', {
        doc: { id, slug: `bulk-${id}`, _status: 'draft' },
        previousDoc: { id, slug: `bulk-${id}`, _status: 'published' },
        context,
      })
    }

    expect(findOneMock).not.toHaveBeenCalled()
    expect(findMock).toHaveBeenCalledOnce()
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()

    await runAfterChange('news', {
      doc: { id: 1, slug: 'bulk-1', _status: 'published' },
      previousDoc: { id: 1, slug: 'bulk-1', _status: 'draft' },
      context,
    })
    expect(revalidateTagMock).toHaveBeenCalledWith('payload:public', { expire: 0 })
  })

  it('captures every published main row affected by a bulk status update', async () => {
    const context: Record<string, unknown> = {}
    findMock.mockResolvedValue({
      docs: [
        { id: 1, slug: 'first-public', _status: 'published' },
        { id: 2, slug: 'second-public', _status: 'published' },
        { id: 3, slug: 'already-draft', _status: 'draft' },
      ],
    })

    await (capturePublicUnpublish as unknown as (args: unknown) => Promise<void>)({
      args: {
        data: { _status: 'draft' },
        draft: false,
        where: { id: { in: [1, 2, 3] } },
      },
      collection: { slug: 'news' },
      context,
      operation: 'update',
      req: {
        id: 'request-123',
        payload: {
          db: { find: findMock },
          logger: { error: loggerErrorMock },
        },
      },
    })

    await runAfterChange('news', {
      doc: { id: 2, slug: 'latest-draft', _status: 'draft' },
      previousDoc: { id: 2, slug: 'latest-draft', _status: 'draft' },
      context,
    })

    expect(findMock).toHaveBeenCalledOnce()
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/second-public')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/news/latest-draft')
  })

  it('logs cache failures with structured mutation context without rejecting the save', async () => {
    revalidateTagMock.mockImplementationOnce(() => {
      throw new Error('cache backend unavailable')
    })

    await expect(
      runAfterChange('news', {
        doc: { id: 42, slug: 'observable', _status: 'published' },
        previousDoc: { id: 42, slug: 'observable', _status: 'draft' },
      }),
    ).resolves.toBeUndefined()

    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'news',
        correlationId: 'request-123',
        documentId: 42,
        error: expect.objectContaining({
          message: 'cache backend unavailable',
          name: 'Error',
        }),
        operation: 'update',
        subsystem: 'cache',
        tag: 'payload:public',
      }),
    )
    expect(revalidateTagMock).toHaveBeenCalledWith('payload:collection:news', { expire: 0 })
  })

  it('revalidates on published-doc update (published→published)', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'published' },
      previousDoc: { id: 1, slug: 'my-news', _status: 'published' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
  })

  it('does not apply the draft guard when _status is absent (non-versioned collections)', async () => {
    // Collections without drafts have no `_status` field. The guard must
    // be bypassed so revalidation still fires (regression guard for
    // Media, Categories, Sliders, etc.).
    await runAfterChange('media', {
      doc: { id: 1, filename: 'photo.jpg' },
      previousDoc: { id: 1, filename: 'photo.jpg' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
  })

  it('still respects context.disableRevalidate even on publish transition', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'my-news', _status: 'published' },
      previousDoc: { id: 1, slug: 'my-news', _status: 'draft' },
      context: { disableRevalidate: true },
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('uses the registered news prefix for old and current slugs', async () => {
    await runAfterChange('news', {
      doc: { id: 1, slug: 'new-slug', _status: 'published' },
      previousDoc: { id: 1, slug: 'old-slug', _status: 'published' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/old-slug')
    expect(revalidatePathMock).toHaveBeenCalledWith('/news/new-slug')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/old-slug')
  })

  it('uses the registered colleges prefix on slug rename', async () => {
    await runAfterChange('colleges', {
      doc: { id: 1, slug: 'engineering', _status: 'published' },
      previousDoc: { id: 1, slug: 'old-engineering', _status: 'published' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/old-engineering')
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering')
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/old-engineering/faculty')
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering/faculty')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/old-engineering')
  })

  it('maps the home page slug to the root path', async () => {
    await runAfterChange('pages', {
      doc: { id: 1, slug: 'home', _status: 'published' },
      previousDoc: { id: 1, slug: 'landing', _status: 'published' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
    expect(revalidatePathMock).toHaveBeenCalledWith('/landing')
    expect(revalidatePathMock).not.toHaveBeenCalledWith('/home')
  })

  it('supports registered multi-segment prefixes', async () => {
    await runAfterChange('research-publications', {
      doc: { id: 1, slug: 'new-slug', _status: 'published' },
      previousDoc: { id: 1, slug: 'old-slug', _status: 'published' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/research/articles/old-slug')
  })

  it('does not invent a detail route for a no-detail collection', async () => {
    await runAfterChange('faqs', {
      doc: { id: 1, slug: 'new-slug', _status: 'published' },
      previousDoc: { id: 1, slug: 'old-slug', _status: 'published' },
      context: {},
    })
    expect(revalidateTagMock).toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('resolves nested academic-program paths from populated relations', async () => {
    await runAfterChange('academic-programs', {
      doc: {
        id: 1,
        slug: 'software',
        college: { id: 3, slug: 'engineering' },
        _status: 'published',
      },
      previousDoc: {
        id: 1,
        slug: 'old-software',
        college: { id: 3, slug: 'engineering' },
        _status: 'published',
      },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering/programs/old-software')
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering/programs/software')
    expect(revalidatePathMock).not.toHaveBeenCalledWith(
      '/colleges/engineering/programs/software/study-plan',
    )
  })

  it('loads missing relationship slugs for nested hook documents', async () => {
    findByIDMock.mockResolvedValue({ slug: 'engineering' })
    await runAfterChange('academic-programs', {
      doc: { id: 1, slug: 'software', college: 3, _status: 'published' },
      context: {},
    })
    expect(findByIDMock).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'colleges', id: 3, depth: 0 }),
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering/programs/software')
  })

  it('resolves the nested study-plan route from college and program', async () => {
    await runAfterChange('study-plans', {
      doc: {
        id: 1,
        college: { id: 3, slug: 'engineering' },
        academicProgram: { id: 5, slug: 'software' },
        _status: 'published',
      },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/colleges/engineering/programs/software/study-plan',
    )
  })

  it('revalidates the resolved public path after delete', async () => {
    await runAfterDelete('colleges', {
      doc: { id: 1, slug: 'engineering', _status: 'published' },
      context: {},
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering')
    expect(revalidatePathMock).toHaveBeenCalledWith('/colleges/engineering/faculty')
  })
})
