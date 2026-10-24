import { beforeEach, describe, expect, it, vi } from 'vitest'

const findByID = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({ findByID }),
}))
vi.mock('@payload-config', () => ({ default: {} }))

import { getDraftPreviewDocument } from '../get-draft-preview-document'

const args = {
  collection: 'news' as const,
  documentId: 42,
  user: { id: 7 } as never,
}

describe('getDraftPreviewDocument', () => {
  beforeEach(() => {
    findByID.mockReset()
  })

  it.each([
    { name: 'Forbidden', status: 403 },
    { name: 'NotFound', status: 404 },
    { isOperational: true, name: 'e', status: 403 },
  ])('normalizes a bundled Payload $name access miss to null', async (accessError) => {
    findByID.mockRejectedValueOnce({ ...accessError, message: 'Access denied' })

    await expect(getDraftPreviewDocument(args)).resolves.toBeNull()
  })

  it('does not hide unrelated errors that merely expose an HTTP status', async () => {
    const error = Object.assign(new Error('Database failed'), { status: 404 })
    findByID.mockRejectedValueOnce(error)

    await expect(getDraftPreviewDocument(args)).rejects.toBe(error)
  })

  it('loads the ID-bound latest draft with Payload access enabled', async () => {
    findByID.mockResolvedValueOnce({ id: 42, title: 'Draft' })

    await expect(getDraftPreviewDocument(args)).resolves.toMatchObject({ id: 42 })
    expect(findByID).toHaveBeenCalledWith({
      collection: 'news',
      depth: 1,
      draft: true,
      id: 42,
      overrideAccess: false,
      user: args.user,
    })
  })
})
