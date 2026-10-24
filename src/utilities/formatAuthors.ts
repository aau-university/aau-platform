import type { User } from '@/payload-types'

/**
 * Format a list of users into a comma-separated list of full names.
 *
 * Used by news/blog post bylines. Returns an empty string when the input is
 * null, undefined, or empty. Users without a usable name are skipped.
 *
 * @example
 *   formatAuthors([{ firstName: 'A', lastName: 'B' }])                       // 'A B'
 *   formatAuthors([{ firstName: 'A', lastName: 'B' }, { firstName: 'C' }])   // 'A B, C'
 */
export const formatAuthors = (
  users: (Pick<User, 'firstName' | 'lastName'> | null | undefined)[] | null | undefined,
): string => {
  if (!Array.isArray(users)) return ''

  const names = users
    .map((user) => {
      if (!user) return ''
      const first = (user.firstName ?? '').trim()
      const last = (user.lastName ?? '').trim()
      return [first, last].filter(Boolean).join(' ')
    })
    .filter((name) => name.length > 0)

  return names.join(', ')
}

export default formatAuthors
