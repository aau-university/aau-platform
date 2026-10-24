import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicNews } from '@/lib/payload/get-public-news'
import { NewsGridSection } from '@/components/sections/NewsGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type NewsGridBlock = Extract<PageLayoutBlock, { blockType: 'newsGrid' }>

function clampLimit(n?: number | null): number {
  if (typeof n !== 'number' || isNaN(n)) return 4
  return Math.max(1, Math.min(8, Math.trunc(n)))
}

export async function NewsSection(props: NewsGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const news = await getPublicNews({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <NewsGridSection news={news} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
