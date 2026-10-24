import type { CollectionBeforeChangeHook } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { Colleges } from '@/collections/Colleges'
import { restrictPublishToLevel } from '@/hooks/restrictPublishToLevel'

type HookArgs = Parameters<CollectionBeforeChangeHook>[0]

const admin = { isActive: true, roleIsActive: true, roleLevel: 4 }
const contentManager = { isActive: true, roleIsActive: true, roleLevel: 3 }
const coordinator = {
  isActive: true,
  roleIsActive: true,
  roleLevel: 2,
  roleSlug: 'coordinator',
  collegeScope: { id: 1 },
}
const student = { isActive: true, roleIsActive: true, roleLevel: 1 }

/**
 * `visibleNow` is the status on the collection's own row — what the public
 * sees. `originalDoc._status` is deliberately allowed to differ from it,
 * because on a drafts collection Payload builds `originalDoc` from the latest
 * *version*, which is a draft after any autosave. The hook must read the row.
 */
function args(overrides: {
  user?: unknown
  data?: Record<string, unknown>
  originalDoc?: Record<string, unknown> | undefined
  operation?: 'create' | 'update'
  query?: Record<string, unknown>
  visibleNow?: string | null
}): HookArgs {
  const findOne = vi.fn().mockResolvedValue(
    overrides.visibleNow === null ? null : { id: 1, _status: overrides.visibleNow ?? 'published' },
  )
  return {
    collection: { slug: 'colleges' },
    data: overrides.data ?? {},
    operation: overrides.operation ?? 'update',
    originalDoc: 'originalDoc' in overrides ? overrides.originalDoc : { id: 1, _status: 'draft' },
    req: {
      user: overrides.user ?? null,
      query: overrides.query ?? {},
      payload: { db: { findOne } },
    },
  } as unknown as HookArgs
}

const hook = restrictPublishToLevel(2)

describe('restrictPublishToLevel', () => {
  it('allows a coordinator taking their scoped published college down', async () => {
    // The failure this replaces was silent: field access on `_status` dropped
    // the value and refilled it from the stored document, so Unpublish returned
    // success and nothing changed.
    await expect(
      hook(args({ user: coordinator, data: { _status: 'draft' }, visibleNow: 'published' })),
    ).resolves.toBeDefined()
  })

  it('allows a coordinator publishing their scoped college', async () => {
    await expect(
      hook(args({ user: coordinator, data: { _status: 'published' }, visibleNow: 'draft' })),
    ).resolves.toBeDefined()
  })

  it('allows a content manager too', async () => {
    // `adminOnlyFieldAccess` on the removed `isActive` checkbox required level
    // 4, so content managers were excluded. Preserved rather than quietly
    // widened.
    await expect(
      hook(args({ user: contentManager, data: { _status: 'draft' }, visibleNow: 'published' })),
    ).resolves.toBeDefined()
  })

  it('allows an administrator either direction', async () => {
    await expect(
      hook(args({ user: admin, data: { _status: 'published' }, visibleNow: 'draft' })),
    ).resolves.toBeDefined()
    await expect(
      hook(args({ user: admin, data: { _status: 'draft' }, visibleNow: 'published' })),
    ).resolves.toBeDefined()
  })

  it('allows a coordinator to push content edits to an already-public college', async () => {
    // The case that caught the first version of this hook. `originalDoc` is the
    // latest version — a draft, after any autosave — so comparing against it
    // read this as `published → draft` and refused it. Re-publishing something
    // already published changes no visibility; blocking it would mean every
    // college edit needed an administrator.
    await expect(
      hook(
        args({
          user: coordinator,
          data: { _status: 'published', deanName: 'new dean' },
          originalDoc: { id: 1, _status: 'draft' },
          visibleNow: 'published',
        }),
      ),
    ).resolves.toBeDefined()
  })

  it('never blocks an autosave, however published the document is', async () => {
    // Payload injects `data._status = 'draft'` on every draft save, and a draft
    // save writes only to `_versions`. Blocking it would make the collection
    // uneditable for coordinators — the opposite failure.
    for (const draftFlag of [true, 'true']) {
      await expect(
        hook(
          args({
            user: coordinator,
            data: { _status: 'draft' },
            visibleNow: 'published',
            query: { draft: draftFlag, autosave: 'true' },
          }),
        ),
      ).resolves.toBeDefined()
    }
  })

  it('refuses a below-threshold publish smuggled in behind ?draft=true', async () => {
    // The draft flag alone does not make a write safe. Payload computes
    // `isSavingDraft` as `draftArg && data._status !== 'published' && …`, so
    // `?draft=true` carrying `_status: 'published'` falls through to
    // `db.updateOne` and publishes for real. Exempting on the flag alone let a
    // coordinator publish their own college with
    // `PATCH /api/colleges/<id>?draft=true` — reproduced against a running
    // server, which answered 200 and moved the row to published.
    for (const draftFlag of [true, 'true']) {
      await expect(
        hook(
          args({
            user: student,
            data: { _status: 'published' },
            visibleNow: 'draft',
            query: { draft: draftFlag },
          }),
        ),
      ).rejects.toThrow(/do not have permission/i)
    }
  })

  it('allows a save that carries no status at all', async () => {
    await expect(
      hook(args({ user: coordinator, data: { name: 'x' }, visibleNow: 'published' })),
    ).resolves.toBeDefined()
  })

  it('refuses a below-threshold published create and allows a draft create', async () => {
    await expect(
      hook(
        args({
          user: student,
          operation: 'create',
          originalDoc: undefined,
          data: { _status: 'published' },
        }),
      ),
    ).rejects.toThrow(/do not have permission/i)

    await expect(
      hook(
        args({
          user: student,
          operation: 'create',
          originalDoc: undefined,
          data: { _status: 'draft' },
        }),
      ),
    ).resolves.toBeDefined()
  })

  it('stays out of the way of system operations', async () => {
    // Trusted system operations such as seeding run without `req.user`.
    // Blocking them would break a fresh seed.
    await expect(
      hook(args({ user: null, data: { _status: 'published' }, visibleNow: 'draft' })),
    ).resolves.toBeDefined()
  })

  it('does not query the row on the paths that exit early', async () => {
    // The extra read must stay off the autosave path, which fires every few
    // hundred milliseconds while an editor types.
    const autosave = args({
      user: coordinator,
      data: { _status: 'draft' },
      query: { draft: 'true' },
    })
    await hook(autosave)
    expect(
      (autosave.req.payload.db.findOne as ReturnType<typeof vi.fn>),
    ).not.toHaveBeenCalled()
  })
})

describe('Colleges wiring', () => {
  it('guards publication with the hook rather than field access on _status', () => {
    const statusField = Colleges.fields.find(
      (field) => 'name' in field && field.name === '_status',
    )
    expect(statusField, 'Colleges must not declare _status with field access').toBeUndefined()
    expect(Colleges.hooks?.beforeChange).toEqual([expect.any(Function)])
  })
})
