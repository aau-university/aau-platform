import type { User } from '@/payload-types'

/** Request-scoped authority passed only between server-side content readers. */
export type ContentReadContext =
  | { draft: false; user?: never }
  | { draft: true; user: User }

export const PUBLIC_CONTENT_READ_CONTEXT: ContentReadContext = { draft: false }

export function contentReadContext(
  draft: boolean,
  user?: User | null,
): ContentReadContext {
  if (!draft) return PUBLIC_CONTENT_READ_CONTEXT
  if (!user) throw new Error('Draft content reads require an authenticated user')
  return { draft: true, user }
}
