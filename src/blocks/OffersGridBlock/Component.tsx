import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicOffers } from '@/lib/payload/get-public-offers'
import { normalizeRelationshipIds } from '@/lib/payload/relationship-ids'
import { OffersGridSection } from '@/components/sections/OffersGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type OffersGridBlock = Extract<PageLayoutBlock, { blockType: 'offersGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function OffersGridBlock_Server(props: OffersGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { categoryFilter, maxItems, locale = 'ar' } = props
  const items = await getPublicOffers({
    categoryIds: normalizeRelationshipIds(categoryFilter),
    limit: clampLimit(maxItems),
    locale,
    readContext: props.readContext,
  })
  return <OffersGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
