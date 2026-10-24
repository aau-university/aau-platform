import { permanentRedirect } from 'next/navigation'

import { getCachedRedirects } from '@/utilities/getCachedRedirects'
import { resolveCollectionPath } from '@/utilities/collectionRoutes'
import type { Redirect } from '@/payload-types'

type RedirectReference = {
  relationTo?: string
  value?: unknown
}

function targetForRedirect(redirect: Redirect): string | null {
  if (!redirect.to) return null

  if (redirect.to.type === 'custom') {
    const target = redirect.to.url?.trim()
    if (!target) return null
    if (target.startsWith('/') && !target.startsWith('//')) return target
    if (/^https?:\/\//i.test(target)) return target
    return null
  }

  if (redirect.to.type !== 'reference') return null
  const reference = redirect.to.reference as RedirectReference | null | undefined
  if (!reference?.relationTo || !reference.value || typeof reference.value !== 'object') {
    return null
  }

  return resolveCollectionPath(
    reference.relationTo,
    reference.value as Record<string, unknown>,
  )
}

function resolveRedirectTarget(url: string, redirects: Redirect[]): string | null {
  const bySource = new Map(redirects.map((redirect) => [redirect.from, redirect]))
  const visited = new Set([url])
  let current = bySource.get(url)

  while (current) {
    const target = targetForRedirect(current)
    if (!target || visited.has(target)) return null
    visited.add(target)

    const chained = bySource.get(target)
    if (!chained) return target
    current = chained
  }

  return null
}

/** Resolve official Payload redirect rows on the server and reject loops. */
export const PayloadRedirects = async ({
  url,
}: {
  url: string
}): Promise<null> => {
  const redirects = await getCachedRedirects()
  const target = resolveRedirectTarget(url, redirects)
  if (target) permanentRedirect(target)

  return null
}

export { resolveRedirectTarget, targetForRedirect }

export default PayloadRedirects
