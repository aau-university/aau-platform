import type { CollectionConfig, CollectionSlug, PayloadRequest } from 'payload'

import { createOrReusePreviewSession, PREVIEW_SESSION_QUERY } from '@/lib/payload/preview-session'
import {
  resolveCollectionPath,
  resolveCollectionPathWithRelationships,
} from './collectionRoutes'

export interface GeneratePreviewPathArgs {
  authSessionId?: null | string
  collection: CollectionSlug
  data: {
    id?: number | string | null
  } & Record<string, unknown>
  req: PayloadRequest
  userId?: number | string | null
  purpose?: 'live-preview' | 'preview'
}

/**
 * Build a short-lived, document-bound preview entry URL.
 *
 * A document id and the authenticated Payload session are required. Trusted
 * Preview authority stays in Redis; the browser receives only an opaque token.
 * Returning null hides Preview while a document is still in the create screen.
 */
export const generatePreviewPath = async ({
  collection,
  authSessionId,
  data,
  req,
  userId,
  purpose = 'preview',
}: GeneratePreviewPathArgs): Promise<null | string> => {
  if (data.id == null || userId == null || !authSessionId) return null

  const token = await createOrReusePreviewSession({
    authSessionId,
    collection,
    documentId: data.id,
    locale: typeof req.locale === 'string' ? req.locale : undefined,
    payload: req.payload,
    purpose,
    userId,
  })

  return `/next/preview?${PREVIEW_SESSION_QUERY}=${encodeURIComponent(token)}`
}

type PreviewAdminOptions = Pick<
  NonNullable<CollectionConfig['admin']>,
  'livePreview' | 'preview'
>

async function resolvePreviewDocumentPath(
  collection: CollectionSlug,
  data: GeneratePreviewPathArgs['data'],
  req: PayloadRequest,
): Promise<null | string> {
  const direct = resolveCollectionPath(collection, data)
  if (direct) return direct

  return resolveCollectionPathWithRelationships(
    collection,
    data,
    async (relationCollection, id) => {
      try {
        const relation = await req.payload.findByID({
          collection: relationCollection,
          id,
          depth: 0,
          draft: true,
          overrideAccess: false,
          req,
          user: req.user,
        })
        return typeof relation.slug === 'string' && relation.slug.trim()
          ? relation.slug
          : null
      } catch (error) {
        const candidate = error instanceof Error ? error : new Error('Unknown relationship error')
        req.payload.logger.error({
          err: { message: candidate.message, name: candidate.name },
          collection,
          documentId: data.id == null ? undefined : String(data.id),
          operation: 'resolve-preview-relationship',
          relationCollection,
          relationId: String(id),
          userId: req.user?.id == null ? undefined : String(req.user.id),
        })
        return null
      }
    },
  )
}

async function requestPreviewPath(
  collection: CollectionSlug,
  data: GeneratePreviewPathArgs['data'],
  req: PayloadRequest,
  purpose: 'live-preview' | 'preview',
): Promise<null | string> {
  if (!(await resolvePreviewDocumentPath(collection, data, req))) return null
  const requestUser = req.user as unknown as Record<string, unknown> | null

  return generatePreviewPath({
    authSessionId:
      requestUser && typeof requestUser._sid === 'string'
        ? requestUser._sid
        : undefined,
    collection,
    data,
    purpose,
    req,
    userId: req.user?.id,
  })
}

/**
 * Wire Payload's two preview callbacks while preserving their different
 * argument shapes.
 */
export function collectionPreview(collection: CollectionSlug): PreviewAdminOptions {
  return {
    livePreview: {
      url: ({ data, req }) =>
        requestPreviewPath(
          collection,
          data as GeneratePreviewPathArgs['data'],
          req,
          'live-preview',
        ),
    },
    preview: (doc, { req }) =>
      requestPreviewPath(
        collection,
        doc as GeneratePreviewPathArgs['data'],
        req,
        'preview',
      ),
  }
}

export default generatePreviewPath
