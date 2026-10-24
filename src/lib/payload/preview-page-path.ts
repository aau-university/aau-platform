import { resolveCollectionPath } from '@/utilities/collectionRoutes'
import { notFound, redirect } from 'next/navigation'

import type { DraftPreviewContext } from './preview-context'

/**
 * Resolve the canonical public path for a ticket-bound Page when the current
 * top-level route no longer matches its latest slug.
 */
export function getPreviewDocumentRedirectPath(
  collection: string,
  requestedPath: string,
  document: Record<string, unknown>,
  token: string,
): string | null {
  const expectedPath = resolveCollectionPath(collection, document)
  if (!expectedPath) return null

  const normalizedRequestedPath = `/${requestedPath.trim().replace(/^\/+|\/+$/g, '')}`
  const normalizedExpectedPath = expectedPath === '/' ? '/' : expectedPath.replace(/\/$/, '')

  if (normalizedExpectedPath === normalizedRequestedPath) return null
  return token
    ? `${normalizedExpectedPath}?previewSession=${encodeURIComponent(token)}`
    : normalizedExpectedPath
}

export function alignDraftPreviewPath(
  preview: DraftPreviewContext,
  collection: string,
  requestedPath: string,
  document: Record<string, unknown>,
): void {
  if (!preview.draft) return
  const canonicalPath = resolveCollectionPath(collection, document)
  if (!canonicalPath) notFound()

  const destination = getPreviewDocumentRedirectPath(
    collection,
    requestedPath,
    document,
    preview.token,
  )
  if (destination) redirect(destination)
}

/** Backwards-compatible Page-only adapter used by focused unit tests. */
export function getPreviewPageRedirectPath(
  requestedSlug: string,
  documentSlug: string | null | undefined,
  token = '',
): string | null {
  return getPreviewDocumentRedirectPath(
    'pages',
    `/${requestedSlug}`,
    { slug: documentSlug },
    token,
  )
}
