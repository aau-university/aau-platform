import { beforeEach, describe, expect, it, vi } from 'vitest'

const { destroyPreviewSessionsForUser } = vi.hoisted(() => ({
  destroyPreviewSessionsForUser: vi.fn(),
}))

vi.mock('@/lib/payload/preview-session', () => ({ destroyPreviewSessionsForUser }))

import { revokePreviewSessionsOnLogout } from '../revokePreviewSessionsOnLogout'
import { Users } from '@/collections/Users'

describe('revokePreviewSessionsOnLogout', () => {
  beforeEach(() => {
    destroyPreviewSessionsForUser.mockReset()
  })

  it('is registered on Payload\'s official users afterLogout hook', () => {
    expect(Users.hooks?.afterLogout).toContain(revokePreviewSessionsOnLogout)
  })

  it('revokes all Preview sessions for the authenticated Payload user', async () => {
    const payload = { logger: { error: vi.fn() } }

    await revokePreviewSessionsOnLogout({
      collection: {} as never,
      context: {},
      req: { payload, user: { id: 42 } } as never,
    })

    expect(destroyPreviewSessionsForUser).toHaveBeenCalledWith({ payload, userId: 42 })
  })

  it('does nothing when logout has no authenticated user', async () => {
    await revokePreviewSessionsOnLogout({
      collection: {} as never,
      context: {},
      req: { user: null } as never,
    })

    expect(destroyPreviewSessionsForUser).not.toHaveBeenCalled()
  })

  it('logs Redis cleanup failure without preventing Payload logout', async () => {
    destroyPreviewSessionsForUser.mockRejectedValueOnce(new Error('Redis unavailable'))
    const logger = { error: vi.fn() }

    await expect(revokePreviewSessionsOnLogout({
      collection: {} as never,
      context: {},
      req: { payload: { logger }, user: { id: 42 } } as never,
    })).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'revoke-preview-sessions-on-logout',
      userId: '42',
    }))
  })
})
