import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicPrograms } from '@/lib/payload/get-public-programs'
import { ProgramsGridSection } from '@/components/sections/ProgramsGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type ProgramsGridBlock = Extract<PageLayoutBlock, { blockType: 'programsGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function ProgramsGridBlock_Server(
  props: ProgramsGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext },
) {
  const { maxItems, locale = 'ar', collegeFilter, degreeFilter } = props

  // `collegeFilter` can be a populated College object (depth > 0) or a bare
  // numeric id. Normalise to a primitive id for the loader's Where clause.
  const collegeId =
    collegeFilter == null
      ? null
      : typeof collegeFilter === 'object' && 'id' in collegeFilter
        ? String((collegeFilter as { id?: string | number }).id ?? '')
        : String(collegeFilter)

  const items = await getPublicPrograms({
    limit: clampLimit(maxItems),
    locale,
    collegeId: collegeId || null,
    degreeType: degreeFilter ?? null,
    readContext: props.readContext,
  })

  return (
    <ProgramsGridSection
      items={items}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
