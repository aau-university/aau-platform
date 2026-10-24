import type { CollectionSlug } from 'payload'

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { isRoleActive, isUserActive } from '@/access'
import type { User } from '@/payload-types'
import { isLocale } from '@/i18n/locale'
import { getDraftPreviewDocument } from '@/lib/payload/get-draft-preview-document'
import {
  PREVIEW_SESSION_QUERY,
  PreviewSessionUnavailableError,
  resolvePreviewSession,
} from '@/lib/payload/preview-session'
import {
  hasCollectionDetailRoute,
  resolveCollectionPath,
} from '@/utilities/collectionRoutes'

function isPreviewable(payload: Awaited<ReturnType<typeof getPayload>>, collection: string): boolean {
  const collectionConfig = payload.config.collections.find((entry) => entry.slug === collection)
  if (!collectionConfig?.versions?.drafts) return false

  return hasCollectionDetailRoute(collection)
}

export const GET = async (req: Request): Promise<Response> => {
  const token = new URL(req.url).searchParams.get(PREVIEW_SESSION_QUERY)
  if (!token) return new Response('Missing Preview session', { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const authenticated = await payload.auth({ headers: req.headers })
  const user = authenticated.user as User | null
  if (!user || !isUserActive(user) || !isRoleActive(user)) {
    return new Response('Preview authentication required', { status: 401 })
  }

  let session
  try {
    session = await resolvePreviewSession({ payload, token })
  } catch (error) {
    if (error instanceof PreviewSessionUnavailableError) {
      return new Response('Preview is temporarily unavailable', { status: 503 })
    }
    throw error
  }
  const authSessionId = (user as User & { _sid?: unknown })._sid
  if (
    !session ||
    session.userId !== String(user.id) ||
    typeof authSessionId !== 'string' ||
    session.authSessionId !== authSessionId
  ) {
    return new Response('Invalid or expired Preview session', { status: 401 })
  }
  if (!isPreviewable(payload, session.collection)) {
    return new Response('Collection is not previewable', { status: 400 })
  }

  let doc: Record<string, unknown> | null
  try {
    doc = (await getDraftPreviewDocument({
      collection: session.collection as CollectionSlug,
      documentId: session.documentId,
      depth: 2,
      locale: isLocale(session.locale) ? session.locale : undefined,
      user,
    })) as unknown as Record<string, unknown>
  } catch (error) {
    const candidate = error instanceof Error ? error : new Error('Unknown Preview route error')
    payload.logger.error({
      err: { message: candidate.message, name: candidate.name },
      collection: session.collection,
      documentId: session.documentId,
      operation: 'resolve-preview-document',
      userId: String(user.id),
    })
    return new Response('Preview could not load the document', { status: 500 })
  }
  if (!doc) return new Response('Document not found or forbidden', { status: 404 })

  const path = resolveCollectionPath(session.collection, doc)
  if (!path) return new Response('Collection path could not be resolved', { status: 404 })

  const draft = await draftMode()
  await draft.enable()

  const destination = new URL(path, req.url)
  destination.searchParams.set(PREVIEW_SESSION_QUERY, token)
  redirect(`${destination.pathname}${destination.search}`)
}
