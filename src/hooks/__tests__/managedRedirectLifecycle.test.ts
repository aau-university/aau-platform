import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncManagedRedirects } from '@/hooks/managedRedirectLifecycle'

const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const remove = vi.fn()

function request() {
  return {
    payload: { find, create, update, delete: remove },
  } as never
}

describe('syncManagedRedirects', () => {
  beforeEach(() => {
    find.mockReset()
    create.mockReset()
    update.mockReset()
    remove.mockReset()
  })

  it('creates an official plugin row for a public canonical route change', async () => {
    find
      .mockResolvedValueOnce({ docs: [] }) // managed rows owned by the document
      .mockResolvedValueOnce({ docs: [] }) // current canonical conflicts
      .mockResolvedValueOnce({ docs: [] }) // previous route conflicts

    await syncManagedRedirects({
      collection: 'news',
      currentPath: '/news/new',
      documentId: 7,
      isPublic: true,
      previousPath: '/news/old',
      req: request(),
    })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'redirects',
      overrideAccess: true,
      data: expect.objectContaining({
        from: '/news/old',
        managed: true,
        managedTargetCollection: 'news',
        managedTargetDocumentId: '7',
        managedTargetRouteKey: 'detail',
        to: { type: 'custom', url: '/news/new' },
      }),
    }))
  })

  it('never overwrites an editor-authored redirect', async () => {
    find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ id: 20, from: '/news/old', managed: false }] })

    await syncManagedRedirects({
      collection: 'news',
      currentPath: '/news/new',
      documentId: 7,
      isPublic: true,
      previousPath: '/news/old',
      req: request(),
    })

    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('disables all document-owned redirects when the document is unpublished', async () => {
    find.mockResolvedValueOnce({
      docs: [
        { id: 1, from: '/news/a', disabled: false },
        { id: 2, from: '/news/b', disabled: true },
      ],
    })

    await syncManagedRedirects({
      collection: 'news',
      currentPath: null,
      documentId: 7,
      isPublic: false,
      previousPath: '/news/a',
      req: request(),
    })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      data: { disabled: true },
      overrideAccess: true,
    }))
  })

  it('flattens every historical route to the latest canonical path', async () => {
    find
      .mockResolvedValueOnce({
        docs: [
          { id: 1, from: '/news/a', to: { type: 'custom', url: '/news/b' } },
          { id: 2, from: '/news/b', to: { type: 'custom', url: '/news/c' } },
        ],
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{
          id: 2,
          from: '/news/b',
          managed: true,
          managedTargetCollection: 'news',
          managedTargetDocumentId: '7',
          managedTargetRouteKey: 'detail',
        }],
      })

    await syncManagedRedirects({
      collection: 'news',
      currentPath: '/news/c',
      documentId: 7,
      isPublic: true,
      previousPath: '/news/b',
      req: request(),
    })

    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      data: { disabled: false, to: { type: 'custom', url: '/news/c' } },
    }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: 2,
      data: { disabled: false, to: { type: 'custom', url: '/news/c' } },
    }))
    expect(create).not.toHaveBeenCalled()
  })
})
