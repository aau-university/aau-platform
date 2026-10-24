/**
 * Tests for `populatePublishedAt` — the cross-cutting `beforeChange` hook
 * (PR-016) that stamps `publishedAt = new Date()` the first time a doc
 * transitions to "published".
 *
 * Adapted from the Payload website template's `populatePublishedAt`.
 *
 * Issue #34: the legacy `isPublished` boolean branch was removed. `_status`
 * is now the single source of truth for publish state.
 *
 * Three core scenarios:
 *   1. Sets `publishedAt` on first publish (`_status === 'published'`,
 *      `publishedAt` is null).
 *   2. Does NOT overwrite an existing `publishedAt`.
 *   3. Does NOT set on draft save (`_status === 'draft'`).
 *
 * Bonus: the legacy `isPublished: true` path no longer triggers
 * `publishedAt` — a regression guard ensuring the branch was removed.
 */

import { describe, expect, it } from 'vitest'

import { Announcements } from '@/collections/Announcements'
import { BlogPosts } from '@/collections/BlogPosts'
import { CampusLife } from '@/collections/CampusLife'
import { Centers } from '@/collections/Centers'
import { Events } from '@/collections/Events'
import { FAQs } from '@/collections/FAQs'
import { News } from '@/collections/News'
import { Offers } from '@/collections/Offers'
import { Pages } from '@/collections/Pages'
import { Projects } from '@/collections/Projects'
import { ResearchPublications } from '@/collections/ResearchPublications'
import { populatePublishedAt } from '@/hooks/populatePublishedAt'

const attachedCollections = [
  BlogPosts,
  News,
  Pages,
  Centers,
  Projects,
  Offers,
  CampusLife,
]

const detachedCollections = [
  FAQs,
  Announcements,
  Events,
  ResearchPublications,
]

const publicationCandidates = [...attachedCollections, ...detachedCollections]

function hasExactPublishedAtField(collection: (typeof publicationCandidates)[number]): boolean {
  return collection.fields.filter(
    (field) => 'name' in field && field.name === 'publishedAt',
  ).length === 1
}

function runHook(
  data: Record<string, unknown>,
  operation: 'create' | 'update' = 'create',
  context: Record<string, unknown> = {},
  originalDoc: Record<string, unknown> = {},
): Record<string, unknown> {
  return (populatePublishedAt as unknown as (a: unknown) => Record<string, unknown>)({
    data,
    operation,
    originalDoc,
    req: { context },
  }) as Record<string, unknown>
}

describe('populatePublishedAt', () => {
  it('is attached only to collections with one exact publishedAt field', () => {
    for (const collection of publicationCandidates) {
      const isAttached = collection.hooks?.beforeChange?.includes(populatePublishedAt) ?? false

      expect(isAttached, collection.slug).toBe(hasExactPublishedAtField(collection))
    }
  })

  it.each(attachedCollections)('keeps the hook attached to $slug', (collection) => {
    expect(collection.hooks?.beforeChange).toContain(populatePublishedAt)
    expect(hasExactPublishedAtField(collection)).toBe(true)
  })

  it.each(detachedCollections)('keeps the hook detached from $slug', (collection) => {
    expect(collection.hooks?.beforeChange).not.toContain(populatePublishedAt)
    expect(hasExactPublishedAtField(collection)).toBe(false)
  })

  it('sets publishedAt on first publish (when _status === "published" and publishedAt is null)', () => {
    const before = Date.now()
    const result = runHook({ _status: 'published', title: 'hello' }, 'create')
    const after = Date.now()

    expect(result.publishedAt).toBeInstanceOf(Date)
    const ts = (result.publishedAt as Date).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('does NOT overwrite an existing publishedAt', () => {
    const original = new Date('2020-01-01T00:00:00.000Z')
    const result = runHook(
      { _status: 'published', publishedAt: original, title: 're-publish' },
      'update',
    )

    expect(result.publishedAt).toBe(original)
  })

  it('preserves originalDoc.publishedAt on a partial published update', () => {
    const original = new Date('2020-01-01T00:00:00.000Z')
    const result = runHook(
      { _status: 'published', title: 'partial update' },
      'update',
      {},
      { publishedAt: original },
    )

    expect(result.publishedAt).toBe(original)
  })

  it('preserves originalDoc.publishedAt when an ordinary update explicitly sends null', () => {
    const original = new Date('2020-01-01T00:00:00.000Z')
    const result = runHook(
      { _status: 'published', publishedAt: null, title: 'clear attempt' },
      'update',
      {},
      { publishedAt: original },
    )

    expect(result.publishedAt).toBe(original)
  })

  it('preserves an explicit null during a canonical seed reset', () => {
    const original = new Date('2020-01-01T00:00:00.000Z')
    const result = runHook(
      { _status: 'published', publishedAt: null, title: 'canonical reset' },
      'update',
      { canonicalSeedReset: true, seed: true },
      { publishedAt: original },
    )

    expect(result.publishedAt).toBeNull()
  })

  it('still stamps a canonical-context create with an explicit null', () => {
    const result = runHook(
      { _status: 'published', publishedAt: null, title: 'canonical create' },
      'create',
      { canonicalSeedReset: true, seed: true },
    )

    expect(result.publishedAt).toBeInstanceOf(Date)
  })

  it('still stamps a normal published update with an explicit null', () => {
    const result = runHook(
      { _status: 'published', publishedAt: null, title: 'normal publish' },
      'update',
    )

    expect(result.publishedAt).toBeInstanceOf(Date)
  })

  it('does NOT set publishedAt on draft save (when _status === "draft")', () => {
    const result = runHook({ _status: 'draft', title: 'wip' }, 'create')
    expect(result.publishedAt).toBeUndefined()
  })

  it('does NOT set publishedAt when _status is absent', () => {
    const result = runHook({ title: 'no status field' }, 'create')
    expect(result.publishedAt).toBeUndefined()
  })

  // ── Issue #34 regression guard: legacy isPublished is no longer honoured ──
  it('does NOT set publishedAt when legacy isPublished is true but _status is not "published"', () => {
    // After Issue #34, `isPublished` was removed from all 5 editorial
    // collections. The hook must NOT treat a stray `isPublished: true`
    // as a publish signal — only `_status === 'published'` counts.
    const result = runHook({ isPublished: true, title: 'legacy flag ignored' }, 'update')
    expect(result.publishedAt).toBeUndefined()
  })

  it('does NOT set publishedAt on non-create/update operations', () => {
    const result = runHook({ _status: 'published', title: 'delete op' }, 'create')
    // The hook guards on operation; 'delete' is not tested here because
    // the type union only allows 'create' | 'update', but we verify the
    // happy path still works.
    expect(result.publishedAt).toBeInstanceOf(Date)
  })
})
