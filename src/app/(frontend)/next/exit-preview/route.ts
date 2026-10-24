import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import {
  destroyPreviewSession,
  PREVIEW_SESSION_QUERY,
  PreviewSessionUnavailableError,
  resolvePreviewSession,
} from '@/lib/payload/preview-session'

function safeReturnPath(request: Request): string {
  const raw = new URL(request.url).searchParams.get('returnTo')
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/'

  const resolved = new URL(raw, request.url)
  return resolved.origin === new URL(request.url).origin
    ? `${resolved.pathname}${resolved.search}${resolved.hash}`
    : '/'
}

export const GET = async (request: Request): Promise<Response> => {
  const draft = await draftMode()
  await draft.disable()

  const token = new URL(request.url).searchParams.get(PREVIEW_SESSION_QUERY)
  if (token) {
    const payload = await getPayload({ config: configPromise })
    try {
      const authenticated = await payload.auth({ headers: request.headers })
      const user = authenticated.user
      const authSessionId = user && (user as { _sid?: unknown })._sid

      if (user && typeof authSessionId === 'string') {
        const session = await resolvePreviewSession({ payload, token })
        if (
          session &&
          session.userId === String(user.id) &&
          session.authSessionId === authSessionId
        ) {
          await destroyPreviewSession({ payload, token })
        }
      }
    } catch (error) {
      if (!(error instanceof PreviewSessionUnavailableError)) throw error
      return new Response('Preview was disabled, but its session could not be revoked', {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      })
    }
  }

  return new Response(null, {
    status: 307,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Location: safeReturnPath(request),
    },
  })
}
