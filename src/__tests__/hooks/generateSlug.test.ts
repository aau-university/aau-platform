/**
 * Tests for `generateSlugBeforeValidate` hook (Issue #36).
 *
 * Verifies that the hook's `makeUniqueSlug` helper threads `req` to the
 * nested `payload.find` call — required for transaction safety per
 * ADAPTERS.md. Without `req`, the uniqueness check runs in a separate
 * transaction and can produce duplicate slugs under concurrent writes.
 */

import { describe, expect, it, vi } from 'vitest'

import { generateSlugBeforeValidate } from '@/hooks/generateSlug'

function runHook(args: {
  data: Record<string, unknown>
  /** Slugs that already exist in the DB — the mock returns a match for these. */
  occupiedSlugs?: string[]
  originalDoc?: Record<string, unknown>
}): { result: Promise<Record<string, unknown>>; find: ReturnType<typeof vi.fn>; req: unknown } {
  // Mock `find` returns a matching doc ONLY when the queried slug is in the
  // occupied set. This mirrors real DB behavior and prevents infinite loops
  // in the retry logic.
  const find = vi.fn(async (callArgs: { where?: { slug?: { equals?: string } } }) => {
    const candidate = callArgs.where?.slug?.equals
    if (candidate && args.occupiedSlugs?.includes(candidate)) {
      return { docs: [{ id: 'doc-existing', slug: candidate }], totalDocs: 1 }
    }
    return { docs: [], totalDocs: 0 }
  })
  const req = { payload: { find }, user: { id: 'u-1' } }

  const result = (generateSlugBeforeValidate('title') as unknown as (a: unknown) => Promise<unknown>)({
    data: args.data,
    originalDoc: args.originalDoc,
    req,
    collection: { slug: 'news' },
    operation: 'create',
  }) as Promise<Record<string, unknown>>

  return { result, find, req }
}

describe('generateSlugBeforeValidate — req threading (Issue #36)', () => {
  it('threads req to payload.find for uniqueness check', async () => {
    const { result, find, req } = runHook({
      data: { title: 'Hello World' },
      occupiedSlugs: [],
    })

    await result

    expect(find).toHaveBeenCalled()
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ req }))
  })

  it('threads req on every retry iteration (slug collision)', async () => {
    const { result, find, req } = runHook({
      data: { title: 'Existing Slug' },
      // 'existing-slug' and 'existing-slug-2' are taken → hook retries until
      // it finds 'existing-slug-3' which is free.
      occupiedSlugs: ['existing-slug', 'existing-slug-2'],
    })

    const data = await result

    // Three find calls: 'existing-slug' (taken), 'existing-slug-2' (taken),
    // 'existing-slug-3' (free → returned).
    expect(find.mock.calls.length).toBe(3)
    for (const call of find.mock.calls) {
      expect(call[0]).toMatchObject({ req })
    }
    expect(data.slug).toBe('existing-slug-3')
  })

  it('still produces a valid slug when no collisions', async () => {
    const { result } = runHook({
      data: { title: 'Unique Title' },
      occupiedSlugs: [],
    })

    const data = await result
    expect(data.slug).toBe('unique-title')
  })
})
