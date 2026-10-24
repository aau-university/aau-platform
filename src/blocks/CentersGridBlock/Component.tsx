import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicCenters } from '@/lib/payload/get-public-centers'
import { CentersGridSection } from '@/components/sections/CentersGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type CentersGridBlock = Extract<PageLayoutBlock, { blockType: 'centersGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function CentersGridBlock_Server(props: CentersGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const items = await getPublicCenters({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <CentersGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
