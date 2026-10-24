import { describe, expect, it } from 'vitest'

import { populateUploadedBy } from '../populateUploadedBy'

function run(args: {
  data?: Record<string, unknown>
  operation: 'create' | 'update'
  originalDoc?: Record<string, unknown>
  user?: { id: number } | null
}) {
  return populateUploadedBy({
    data: args.data ?? {},
    operation: args.operation,
    originalDoc: args.originalDoc,
    req: { user: args.user ?? null },
  } as never)
}

describe('populateUploadedBy hook', () => {
  it('stamps the authenticated uploader on create', () => {
    const result = run({ operation: 'create', user: { id: 9 } })
    expect(result).toMatchObject({ uploadedBy: 9 })
  })

  it('discards a client-supplied owner on create (hook is the source of truth)', () => {
    const result = run({
      operation: 'create',
      data: { uploadedBy: 12345 },
      user: { id: 9 },
    })
    expect(result).toMatchObject({ uploadedBy: 9 })
  })

  it('leaves the field empty for server-side creates without a user (seed/scripts)', () => {
    const result = run({ operation: 'create', user: null })
    expect(result).toMatchObject({ uploadedBy: null })
  })

  it('preserves the stored owner on update — ownership never transfers', () => {
    const result = run({
      operation: 'update',
      data: { uploadedBy: 777 },
      originalDoc: { uploadedBy: { id: 9 } },
      user: { id: 4 },
    })
    expect(result).toMatchObject({ uploadedBy: 9 })
  })

  it('keeps a scalar stored owner on update', () => {
    const result = run({
      operation: 'update',
      data: {},
      originalDoc: { uploadedBy: 9 },
      user: { id: 4 },
    })
    expect(result).toMatchObject({ uploadedBy: 9 })
  })
})
