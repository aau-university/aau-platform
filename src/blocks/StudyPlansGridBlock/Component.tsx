import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicStudyPlans } from '@/lib/payload/get-public-study-plans'
import { StudyPlansGridSection } from '@/components/sections/StudyPlansGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type StudyPlansGridBlock = Extract<PageLayoutBlock, { blockType: 'studyPlansGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function StudyPlansGridBlock_Server(props: StudyPlansGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const items = await getPublicStudyPlans({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <StudyPlansGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
