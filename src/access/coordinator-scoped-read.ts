import type { Access } from 'payload'

import { hasRoleLevelAtLeast } from './has-role-level-at-least'
import { hasPermission } from './has-permission'
import { isCoordinator } from './is-coordinator'
import { publishedWithRelations } from './published'
import { relationshipId } from './relationship-id'
import { getUserCollegeScope } from './user-inspection'

interface CoordinatorScopedReadOptions {
  collegeField?: string
  permission: string
  publishedRelations?: string[]
}

/**
 * Every college-scoped collection now uses Payload's `_status`, so there is
 * one public constraint rather than a `mode` to pick between.
 *
 * The removed `'active'` mode filtered a hand-rolled `isActive` checkbox. It
 * was a live hazard: passing the wrong mode queried a field the collection did
 * not have, and Payload rejects an unknown field path outright — the exact
 * failure the study-plans loader carried a comment about. Deleting the option
 * removes the chance of choosing wrong.
 */
/**
 * Read access for college-scoped collections.
 *
 * - Anonymous (the public site): published documents only. Every
 *   public loader in `src/lib/payload/*` calls Payload with
 *   `overrideAccess: false` and NO `user`, so the site always lands here and
 *   is unaffected by the authenticated branches below.
 * - Content manager (level 3) and above: everything.
 * - Coordinator with a `collegeScope`: ONLY their own college's documents.
 *   They are college staff, so the admin panel must show their college's
 *   data and nothing else — including other colleges' already-published
 *   documents, which they can neither edit nor need to see here.
 * - Coordinator without a `collegeScope`: nothing. Fails closed and mirrors
 *   `coordinatorScopedUpdate`, which already denies an unscoped coordinator.
 * - Students, doctors, and any other authenticated role: the public
 *   constraint (no privileged visibility).
 */
export function coordinatorScopedRead(options: CoordinatorScopedReadOptions): Access {
  const collegeField = options.collegeField ?? 'college'

  return ({ req }) => {
    const visiblePublicly = publishedWithRelations(...(options.publishedRelations ?? []))

    if (!req.user) return visiblePublicly

    if (hasRoleLevelAtLeast(req.user, 3)) return true

    if (!isCoordinator(req.user)) return visiblePublicly

    if (!hasPermission(req.user, options.permission)) return false

    const scopeId = relationshipId(getUserCollegeScope(req.user))
    if (scopeId === undefined) return false

    return { [collegeField]: { equals: scopeId } }
  }
}
