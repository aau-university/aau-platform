import { draftMode, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { isRoleActive, isUserActive } from '@/access'
import type { User } from '@/payload-types'
import { isLocale, type Locale } from '@/i18n/locale'
import { resolvePreviewSession } from '@/lib/payload/preview-session'

export type DraftPreviewContext =
  | { draft: false; user: null; collection: null; documentId: null; locale: null; token: null }
  | {
      draft: true
      user: User
      collection: string
      documentId: string
      locale: string | null
      token: string
    }

export type PreviewSearchParams = Promise<{
  previewSession?: string | string[]
}>

export async function getDraftPreviewContextFromSearchParams(
  searchParams: PreviewSearchParams,
): Promise<DraftPreviewContext> {
  const value = (await searchParams).previewSession
  return getDraftPreviewContext(Array.isArray(value) ? value[0] : value)
}

/**
 * Resolve draft authorization at the request boundary.
 *
 * A clean URL is always public, even if this browser still carries Next's
 * Draft Mode cookie from another Preview tab. Only an explicit Preview
 * session token opts the request into the authenticated draft path.
 *
 * This function intentionally owns all request APIs. Draft loaders remain
 * uncached and receive the authenticated user as an ordinary argument; cached
 * published loaders never read cookies or headers.
 */
export async function getDraftPreviewContext(
  previewToken?: null | string,
): Promise<DraftPreviewContext> {
  if (!previewToken) {
    return { draft: false, user: null, collection: null, documentId: null, locale: null, token: null }
  }

  const { isEnabled } = await draftMode()
  if (!isEnabled) notFound()

  const [requestHeaders, payload] = await Promise.all([
    headers(),
    getPayload({ config: configPromise }),
  ])

  const authenticated = await payload.auth({ headers: requestHeaders })
  const user = authenticated.user as User | null
  if (!user || !isUserActive(user) || !isRoleActive(user)) notFound()

  const session = await resolvePreviewSession({ payload, token: previewToken })
  const authSessionId = (user as User & { _sid?: unknown })._sid
  if (
    !session ||
    session.userId !== String(user.id) ||
    typeof authSessionId !== 'string' ||
    session.authSessionId !== authSessionId
  ) {
    notFound()
  }

  return {
    draft: true,
    user,
    collection: session.collection,
    documentId: session.documentId,
    locale: session.locale ?? null,
    token: previewToken,
  }
}

export function assertPreviewDocument(
  context: DraftPreviewContext,
  collection: string,
  documentId: number | string | null | undefined,
): void {
  if (!context.draft) return
  if (
    context.collection !== collection ||
    documentId == null ||
    context.documentId !== String(documentId)
  ) {
    notFound()
  }
}

export function resolvePreviewLocale(
  context: DraftPreviewContext,
  fallback: Locale,
): Locale {
  return context.draft && isLocale(context.locale) ? context.locale : fallback
}
