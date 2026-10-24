import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const getDraftPreviewDocument = vi.fn()

vi.mock('../safe-payload', () => ({
  getPayloadSafe: vi.fn(async () => ({ find })),
  rethrowPayloadErrorInProduction: vi.fn(),
}))

vi.mock('../get-draft-preview-document', () => ({
  getDraftPreviewDocument,
}))

describe('getPublicPageBySlug', () => {
  beforeEach(() => {
    find.mockReset()
    getDraftPreviewDocument.mockReset()
  })

  it('reads pages with access control enforced', async () => {
    find.mockResolvedValueOnce({
      docs: [{ id: 1, slug: 'home', title: 'Home', layout: [{ blockType: 'hero' }] }],
    })
    const { getPublicPageBySlug } = await import('../get-public-page')
    const page = await getPublicPageBySlug('home', { locale: 'en' })
    expect(page?.layout).toEqual([{ blockType: 'hero' }])
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'pages',
        overrideAccess: false,
        depth: 1,
        locale: 'en',
        draft: false,
      }),
    )
  })

  it('reads drafts uncached with the authenticated user and no published filter', async () => {
    const user = { id: 42 }
    getDraftPreviewDocument.mockResolvedValueOnce({
      id: 1,
      slug: 'home',
      title: 'Draft Home',
      layout: [],
    })
    const { getPublicPageBySlug } = await import('../get-public-page')

    await expect(
      getPublicPageBySlug('home', {
        documentId: 1,
        locale: 'ar',
        draft: true,
        user: user as never,
      }),
    ).resolves.toMatchObject({ title: 'Draft Home' })

    expect(getDraftPreviewDocument).toHaveBeenCalledWith({
      collection: 'pages',
      depth: 1,
      documentId: 1,
      locale: 'ar',
      user,
    })
    expect(find).not.toHaveBeenCalled()
  })

  it('returns null when Payload has no page', async () => {
    find.mockResolvedValueOnce({ docs: [] })
    const { getPublicPageBySlug } = await import('../get-public-page')
    await expect(getPublicPageBySlug('missing')).resolves.toBeNull()
  })
})
