import type { CollectionAfterLogoutHook } from 'payload'

import { destroyPreviewSessionsForUser } from '@/lib/payload/preview-session'

/** Revoke document-bound Preview authority as part of Payload's logout operation. */
export const revokePreviewSessionsOnLogout: CollectionAfterLogoutHook = async ({ req }) => {
  if (req.user?.id == null) return

  try {
    await destroyPreviewSessionsForUser({
      payload: req.payload,
      userId: req.user.id,
    })
  } catch (error) {
    const candidate = error instanceof Error ? error : new Error('Unknown Preview logout error')
    req.payload.logger.error({
      err: { message: candidate.message, name: candidate.name },
      operation: 'revoke-preview-sessions-on-logout',
      subsystem: 'preview-session',
      userId: String(req.user.id),
    })
  }
}
