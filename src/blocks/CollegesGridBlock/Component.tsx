import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicColleges } from '@/lib/payload/get-public-colleges'
import { CollegesGridSection } from '@/components/sections/CollegesGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type CollegesGridBlock = Extract<PageLayoutBlock, { blockType: 'collegesGrid' }>

type CollegesGridBlockServerProps = CollegesGridBlock & {
  locale?: Locale
  disableInnerContainer?: boolean
  readContext?: ContentReadContext
}

function clampLimit(n?: number | null): number {
  if (typeof n !== 'number' || isNaN(n)) return 4
  return Math.max(1, Math.min(8, Math.trunc(n)))
}

/**
 * CollegesGridBlock — Server Component.
 *
 * Fetches college data from Payload CMS and passes it to the
 * client-side CollegesGridSection for rendering.
 */
export async function CollegesSection(props: CollegesGridBlockServerProps) {
  const { maxItems, selectedColleges, locale = 'ar' } = props

  const colleges = await getPublicColleges({
    limit: clampLimit(maxItems),
    locale,
    selectedColleges,
    readContext: props.readContext,
  })

  return (
    <CollegesGridSection
      colleges={colleges}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
