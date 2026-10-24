/**
 * Tests for `AcademicDepartments` revalidation hooks (PR-012 BUGFIX).
 *
 * Pre-PR-012, `AcademicDepartments` had NO `afterChange` / `afterDelete`
 * revalidation hook — editing a department left stale cached pages. PR-012
 * closes that gap by adding `revalidateDepartment` (afterChange) +
 * `revalidateDelete` (afterDelete) which delegate to
 * `revalidatePublicCollection('academic-departments')`.
 *
 * These tests assert the contract the BUGFIX introduces: updating a
 * department busts the `academic-departments-sitemap` tag (alongside the
 * `payload:public` + `payload:collection:academic-departments` tags).
 * `next/cache` is mocked so the tests don't depend on a running Next.js
 * server — vitest's `vi.mock` intercepts both static and dynamic imports.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
const revalidatePathMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { revalidateDelete, revalidateDepartment } from '@/collections/AcademicDepartments/hooks/revalidate'

type HookArgs = {
  doc?: Record<string, unknown>
  previousDoc?: Record<string, unknown>
  context?: Record<string, unknown>
}

async function runAfterChange(args: HookArgs): Promise<void> {
  await (revalidateDepartment as unknown as (a: unknown) => Promise<unknown>)({
    doc: args.doc ?? {},
    previousDoc: args.previousDoc,
    context: args.context ?? {},
    operation: args.previousDoc ? 'update' : 'create',
    req: { payload: undefined },
  })
}

async function runAfterDelete(args: HookArgs): Promise<void> {
  await (revalidateDelete as unknown as (a: unknown) => Promise<unknown>)({
    doc: args.doc ?? {},
    context: args.context ?? {},
    req: { payload: undefined },
  })
}

describe('AcademicDepartments revalidation (PR-012 BUGFIX)', () => {
  beforeEach(() => {
    revalidateTagMock.mockClear()
    revalidatePathMock.mockClear()
  })

  it('registers revalidateDepartment as the afterChange hook', () => {
    expect(AcademicDepartments.hooks?.afterChange).toEqual([revalidateDepartment])
  })

  it('registers revalidateDelete as the afterDelete hook', () => {
    expect(AcademicDepartments.hooks?.afterDelete).toEqual([revalidateDelete])
  })

  it('busts the academic-departments-sitemap tag on afterChange', async () => {
    await runAfterChange({
      doc: { id: 1, name: 'Computer Science', college: 'col-1' },
      context: {},
    })
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('academic-departments-sitemap')
  })

  it('busts the payload:public + payload:collection:academic-departments tags on afterChange', async () => {
    await runAfterChange({
      doc: { id: 1, name: 'Computer Science', college: 'col-1' },
      context: {},
    })
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('payload:public')
    expect(tags).toContain('payload:collection:academic-departments')
  })

  it('busts the academic-departments-sitemap tag on afterDelete', async () => {
    await runAfterDelete({
      doc: { id: 1, name: 'Computer Science', college: 'col-1' },
      context: {},
    })
    const tags = revalidateTagMock.mock.calls.map((call) => call[0])
    expect(tags).toContain('academic-departments-sitemap')
  })

  it('short-circuits afterChange when context.disableRevalidate is true', async () => {
    await runAfterChange({
      doc: { id: 1, name: 'Computer Science' },
      context: { disableRevalidate: true },
    })
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
