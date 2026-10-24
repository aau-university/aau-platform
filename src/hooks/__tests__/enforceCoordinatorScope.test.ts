import { describe, expect, it } from 'vitest'

import { enforceCoordinatorScopeHook } from '../enforceCoordinatorScope'

/**
 * Coordinator scope enforcement at the write boundary.
 *
 * The companion row-level `coordinatorScopedUpdate` Where clause already
 * limits what coordinators can READ/UPDATE through Payload's where filter.
 * This hook is defense in depth — it ensures the *payload* of a write also
 * respects the coordinator's collegeScope, preventing things like:
 *   - coordinator creates news with `college: <some-other-college>`
 *   - coordinator changes an existing doc's `college` field
 */

const COLLEGE_FIELD = 'college'

function runHook(args: {
  data: Record<string, unknown>
  user: Record<string, unknown> | null
  originalDoc?: Record<string, unknown>
  operation: 'create' | 'update'
}) {
  const hook = enforceCoordinatorScopeHook({ collegeField: COLLEGE_FIELD })
  return (hook as unknown as (a: unknown) => Promise<unknown>)({
    data: args.data,
    req: { user: args.user, payload: undefined },
    originalDoc: args.originalDoc,
    operation: args.operation,
    collection: { slug: 'news' },
    context: {},
  })
}

describe('enforceCoordinatorScopeHook', () => {
  // ── Privileged users pass through ───────────────────────────────────────
  it('content_manager passes through with any college', async () => {
    const data = { title: 'X', college: 999 }
    const result = await runHook({
      data,
      user: { isActive: true, role: { slug: 'content_manager', isActive: true } },
      operation: 'create',
    })
    expect(result).toEqual(data) // unchanged
  })

  it('admin passes through unchanged', async () => {
    const result = await runHook({
      data: { college: 999 },
      user: { isActive: true, role: { slug: 'admin', isActive: true } },
      operation: 'update',
      originalDoc: { college: 7 },
    })
    expect(result).toEqual({ college: 999 })
  })

  // ── Non-coordinator low-privilege users pass through (access denies earlier) ─
  it('student/doctor pass through this hook (access layer rejects elsewhere)', async () => {
    const result = await runHook({
      data: { title: 'X' },
      user: { isActive: true, role: { slug: 'student', isActive: true } },
      operation: 'create',
    })
    expect(result).toEqual({ title: 'X' })
  })

  // ── Coordinator without scope ──────────────────────────────────────────
  it('rejects coordinator without a collegeScope', async () => {
    await expect(
      runHook({
        data: { title: 'X' },
        user: { isActive: true, role: { slug: 'coordinator', isActive: true } },
        operation: 'create',
      }),
    ).rejects.toThrow(/missing a collegeScope/i)
  })

  // ── Coordinator: create flows ──────────────────────────────────────────
  it('coordinator on create with no college: hook injects their scope', async () => {
    const result = (await runHook({
      data: { title: 'X' },
      user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
      operation: 'create',
    })) as Record<string, unknown>
    expect(result.college).toBe(7)
  })

  it('coordinator on create with matching college: passes through', async () => {
    const result = await runHook({
      data: { title: 'X', college: 7 },
      user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
      operation: 'create',
    })
    expect(result).toMatchObject({ college: 7 })
  })

  it('coordinator on create with foreign college: REJECTED', async () => {
    await expect(
      runHook({
        data: { title: 'X', college: 99 },
        user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
        operation: 'create',
      }),
    ).rejects.toThrow(/own college/i)
  })

  it('handles scope as a primitive id, not an object', async () => {
    const result = (await runHook({
      data: { title: 'X' },
      user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: 7 },
      operation: 'create',
    })) as Record<string, unknown>
    expect(result.college).toBe(7)
  })

  // ── Coordinator: update flows ──────────────────────────────────────────
  it('coordinator on update with no college change: passes when original is in scope', async () => {
    const result = await runHook({
      data: { title: 'new title' },
      user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
      operation: 'update',
      originalDoc: { college: 7 },
    })
    expect(result).toMatchObject({ title: 'new title' })
  })

  it('coordinator on update CANNOT change college to another value', async () => {
    await expect(
      runHook({
        data: { college: 99 },
        user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
        operation: 'update',
        originalDoc: { college: 7 },
      }),
    ).rejects.toThrow(/another college/i)
  })

  it('coordinator on update CANNOT touch a doc that belongs to another college', async () => {
    await expect(
      runHook({
        data: { title: 'edit' },
        user: { isActive: true, role: { slug: 'coordinator', isActive: true }, collegeScope: { id: 7 } },
        operation: 'update',
        originalDoc: { college: 99 },
      }),
    ).rejects.toThrow(/belonging to their own college/i)
  })
})
