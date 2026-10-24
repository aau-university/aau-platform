import type { Locale } from '@/i18n/locale'
import type { Partner } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { buildActiveWhere, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'

export type PublicPartnerType = 'local' | 'international' | null

export interface PublicPartnerItem {
  id: string
  name: string
  description: string
  logo: string | null
  type: PublicPartnerType
  website: string
  displayOrder: number
}

export interface GetPublicPartnersOptions {
  limit?: number
  locale?: Locale
  page?: number
  type?: 'local' | 'international'
}

function mapType(value: Partner['type']): PublicPartnerType {
  if (value === 'local' || value === 'international') return value
  return null
}

function mapListItem(doc: Partner): PublicPartnerItem {
  return {
    id: String(doc.id ?? ''),
    name: typeof doc.name === 'string' ? doc.name : '',
    description: typeof doc.description === 'string' ? doc.description : '',
    logo: resolveMediaUrl(doc.logo) ?? null,
    type: mapType(doc.type),
    website: typeof doc.website === 'string' ? doc.website : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

export async function getPublicPartners(
  options: GetPublicPartnersOptions = {},
): Promise<PublicPartnerItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('partners'))

  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const activeWhere = buildActiveWhere('isActive')
    const where = options.type
      ? {
          and: [activeWhere, { type: { equals: options.type } }],
        }
      : activeWhere

    const result = await payload.find({
      collection: 'partners',
      where,
      ...buildPublicQueryOptions({ ...options, sort: 'displayOrder', depth: 1 }),
    })

    return result.docs.map((doc: Partner) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}
