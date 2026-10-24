/**
 * Tests for `populateAuthors` — the cross-cutting `beforeChange` hook that
 * snapshots the acting user into a hidden `populatedAuthors` array on the doc.
 *
 * Privacy workaround for AAU's restrictive `users.read` policy
 * (admin-or-self): readers see the snapshot regardless of their
 * `users.read` permission because the array is denormalized at write time
 * rather than hydrated at read time.
 *
 * The field-access assertions and forged-input cases protect the invariant
 * that only the hook, never client input, controls the public snapshot.
 */

import { describe, expect, it } from 'vitest'

import { BlogPosts } from '@/collections/BlogPosts'
import { News } from '@/collections/News'
import { Pages } from '@/collections/Pages'
import { populateAuthors } from '@/hooks/populateAuthors'

function runHook(args: {
  context?: Record<string, unknown>
  data: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  user: Record<string, unknown> | null
  operation?: 'create' | 'update'
}): Record<string, unknown> {
  return (populateAuthors as unknown as (a: unknown) => Record<string, unknown>)({
    data: args.data,
    operation: args.operation ?? 'create',
    originalDoc: args.originalDoc,
    req: { context: args.context ?? {}, user: args.user },
  }) as Record<string, unknown>
}

describe('populateAuthors', () => {
  it.each([
    ['news', News],
    ['blog-posts', BlogPosts],
    ['pages', Pages],
  ])('denies client create and update access to %s.populatedAuthors', (_slug, collection) => {
    const field = collection.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'populatedAuthors',
    )

    expect(field && 'access' in field ? field.access?.create?.({} as never) : undefined).toBe(false)
    expect(field && 'access' in field ? field.access?.update?.({} as never) : undefined).toBe(false)
  })

  it('populates populatedAuthors from req.user', () => {
    const result = runHook({
      data: { title: 'news item' },
      user: { id: 'u-42', name: 'Alice Admin' },
    })

    expect(result.populatedAuthors).toEqual([{ userId: 'u-42', name: 'Alice Admin' }])
  })

  it('does NOT overwrite if already set (same user re-save is a no-op)', () => {
    const existing = [{ userId: 'u-42', name: 'Alice Original-Name' }]
    const result = runHook({
      data: { title: 'edit' },
      originalDoc: { populatedAuthors: existing },
      user: { id: 'u-42', name: 'Alice NEW-Name' }, // same id, different name
      operation: 'update',
    })

    // The existing entry is preserved — name is NOT overwritten.
    expect(result.populatedAuthors).toEqual(existing)
    expect((result.populatedAuthors as Array<{ name: string }>)[0].name).toBe(
      'Alice Original-Name',
    )
  })

  it('accumulates a NEW author without dropping existing entries', () => {
    const result = runHook({
      data: { title: 'co-authored' },
      originalDoc: {
        populatedAuthors: [{ userId: 'u-1', name: 'First Author' }],
      },
      user: { id: 'u-2', name: 'Second Author' },
      operation: 'update',
    })

    expect(result.populatedAuthors).toEqual([
      { userId: 'u-1', name: 'First Author' },
      { userId: 'u-2', name: 'Second Author' },
    ])
  })

  it('ignores forged populatedAuthors input on create', () => {
    const result = runHook({
      data: {
        populatedAuthors: [{ userId: 'forged-user', name: 'Forged Author' }],
        title: 'spoof attempt',
      },
      user: { id: 'u-42', name: 'Alice Admin' },
    })

    expect(result.populatedAuthors).toEqual([{ userId: 'u-42', name: 'Alice Admin' }])
  })

  it('ignores forged populatedAuthors input on update and preserves persisted history', () => {
    const result = runHook({
      data: {
        populatedAuthors: [{ userId: 'forged-user', name: 'Forged Author' }],
        title: 'spoof attempt',
      },
      operation: 'update',
      originalDoc: {
        populatedAuthors: [{ userId: 'u-1', name: 'First Author' }],
      },
      user: { id: 'u-2', name: 'Second Author' },
    })

    expect(result.populatedAuthors).toEqual([
      { userId: 'u-1', name: 'First Author' },
      { userId: 'u-2', name: 'Second Author' },
    ])
  })

  it('falls back to email then id when name is missing', () => {
    const result = runHook({
      data: { title: 'x' },
      user: { id: 'u-99', email: 'bob@example.com' },
    })
    expect(result.populatedAuthors).toEqual([{ userId: 'u-99', name: 'bob@example.com' }])
  })

  it('is a no-op when req.user is missing (seed/import path)', () => {
    const result = runHook({ data: { title: 'x' }, user: null })
    expect(result.populatedAuthors).toBeUndefined()
  })

  it.each(['create', 'update'] as const)(
    'is a no-op for an authenticated seed %s',
    (operation) => {
      const data = { populatedAuthors: [], title: 'canonical seed content' }
      const result = runHook({
        context: { seed: true },
        data,
        operation,
        user: { id: 1, firstName: 'Super', lastName: 'Admin' },
      })

      expect(result).toBe(data)
      expect(result.populatedAuthors).toEqual([])
    },
  )
})
