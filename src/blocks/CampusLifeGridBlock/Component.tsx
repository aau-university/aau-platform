import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicCampusLife } from '@/lib/payload/get-public-campus-life'
import { CampusLifeGridSection } from '@/components/sections/CampusLifeGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type CampusLifeGridBlock = Extract<PageLayoutBlock, { blockType: 'campusLifeGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function CampusLifeGridBlock_Server(props: CampusLifeGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const kindFilter = 'kindFilter' in props ? props.kindFilter : undefined
  const kind = kindFilter === 'life' || kindFilter === 'activity' ? kindFilter : undefined
  const items = await getPublicCampusLife({ kind, limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <CampusLifeGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
