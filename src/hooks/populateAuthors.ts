import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Resolve a display name for the acting user. Order of preference:
 *   1. `user.name` (Payload convention — single display-name field)
 *   2. `firstName + ' ' + lastName` (AAU Users convention)
 *   3. `user.email` (lowest-privilege fallback — always present on auth users)
 *   4. `id` (paranoid fallback — guarantees a non-empty string)
 *
 * Split into its own function so the `??` / `||` precedence issue is
 * resolved with explicit if statements instead of mixed nullish /
 * logical operators (TS error TS5076).
 */
function resolveAuthorName(
  user: {
    name?: string
    email?: string
    firstName?: string
    lastName?: string
  },
  id: string,
): string {
  if (user.name) return user.name
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  if (fullName) return fullName
  if (user.email) return user.email
  return id
}

/**
 * Cross-cutting `beforeChange` hook that snapshots the acting user into a
 * hidden `populatedAuthors: Array<{ userId: string; name: string }>` array on
 * the doc. Privacy workaround for AAU's restrictive `users.read` policy:
 *
 *   - AAU's Users collection has `users.read` scoped to admin-or-self (only
 *     admin+ sees all users; everyone else sees only their own record).
 *   - The official Payload template stores a plain `authors` relationship
 *     array and populates it at READ time. That doesn't work under AAU's
 *     policy — non-admin readers would get `null` for every author.
 *   - Instead, we snapshot `{ userId, name }` at WRITE time into a denormalized
 *     `populatedAuthors` array. Readers see the snapshot regardless of their
 *     `users.read` permission. The hidden field is declared on each
 *     editorial collection's config (admin.hidden: true).
 *
 * The hook appends to the array on every save — this is intentional: the
 * array records every user who has ever edited the doc (audit trail). If
 * the SAME user saves twice, the snapshot is updated in place (matched by
 * `userId`) so we don't grow the array unboundedly on routine re-saves.
 *
 * Don't overwrite if `populatedAuthors` is already set and the acting user
 * is already present (matched by `userId`) — preserves the original snapshot's
 * `name` value if the user has since been renamed. (Per spec requirement:
 * "Don't overwrite if already set" — interpreted per-entry to allow
 * multi-author accumulation while preventing per-author overwrites.)
 *
 * No-op when `req.user` is missing (seeders, importers, migrations) — the
 * `populatedAuthors` array is left untouched.
 */
export const populateAuthors: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'create' && operation !== 'update') {
    return data
  }

  if (req.context.seed === true) {
    return data
  }

  const user = req.user as
    | { id?: string | number; name?: string; email?: string; firstName?: string; lastName?: string }
    | null
    | undefined

  if (!user || user.id === undefined || user.id === null) {
    return data
  }

  const id = String(user.id)
  const name = resolveAuthorName(user, id)

  // Client input for this system-managed field is denied by field access. Read
  // update history only from the persisted document so direct hook invocation
  // or an overrideAccess call cannot smuggle forged author snapshots through.
  const existingValue = operation === 'update' ? originalDoc?.populatedAuthors : undefined
  const existing: Array<{ userId: string; name: string }> = Array.isArray(existingValue)
    ? (existingValue as Array<{ userId: string; name: string }>)
    : []

  // Per-author idempotency: don't overwrite an existing entry's name when
  // the same user re-saves. (Multi-author accumulation is still allowed.)
  const alreadyPresent = existing.some((entry) => entry.userId === id)
  if (alreadyPresent) {
    return {
      ...data,
      populatedAuthors: existing,
    }
  }

  return {
    ...data,
    populatedAuthors: [...existing, { userId: id, name }],
  }
}
