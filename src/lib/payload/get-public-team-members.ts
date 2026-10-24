import type { Locale } from '@/i18n/locale'
import type { TeamMember } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { buildActiveWhere, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'

export interface PublicTeamMemberItem {
  id: string
  name: string
  jobTitle: string
  group: string
  image: string | null
  displayOrder: number
}

export interface GetPublicTeamMembersOptions {
  limit?: number
  locale?: Locale
  page?: number
  group?: string
  selectedIds?: Array<string | number>
}

export async function getPublicTeamMembers(
  options: GetPublicTeamMembersOptions = {},
): Promise<PublicTeamMemberItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('team-members'))

  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const baseOpts = buildPublicQueryOptions({ ...options, sort: 'displayOrder', depth: 1 })

    const activeWhere = buildActiveWhere('isActive')
    const where =
      options.selectedIds && options.selectedIds.length > 0
        ? {
            and: [
              activeWhere,
              { id: { in: options.selectedIds } },
            ],
          }
        : options.group
          ? {
              and: [
                activeWhere,
                { group: { equals: options.group } },
              ],
            }
          : activeWhere

    const result = await payload.find({
      collection: 'team-members',
      where,
      ...baseOpts,
    })

    return result.docs.map((doc: TeamMember): PublicTeamMemberItem => ({
      id: String(doc.id ?? ''),
      name: typeof doc.name === 'string' ? doc.name : '',
      jobTitle: typeof doc.jobTitle === 'string' ? doc.jobTitle : '',
      group: typeof doc.group === 'string' ? doc.group : '',
      image: resolveMediaUrl(doc.image) ?? null,
      displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
    }))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}
