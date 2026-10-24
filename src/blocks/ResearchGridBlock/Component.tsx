import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicResearchArticles } from '@/lib/payload/get-public-research'
import { normalizeRelationshipIds } from '@/lib/payload/relationship-ids'
import { ResearchGridSection } from '@/components/sections/ResearchGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type ResearchGridBlock = Extract<PageLayoutBlock, { blockType: 'researchGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function ResearchGridBlock_Server(props: ResearchGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { categoryFilter, maxItems, locale = 'ar' } = props
  const items = await getPublicResearchArticles({
    categoryIds: normalizeRelationshipIds(categoryFilter),
    limit: clampLimit(maxItems),
    locale,
    readContext: props.readContext,
  })
  return <ResearchGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
