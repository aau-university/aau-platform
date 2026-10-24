import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicFacultyList } from '@/lib/payload/get-public-faculty'
import { FacultyGridSection } from '@/components/sections/FacultyGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type FacultyMembersBlock = Extract<PageLayoutBlock, { blockType: 'facultyMembers' }>

function clampLimit(n?: number | null, fallback = 12): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(24, Math.trunc(n)))
}

export async function FacultyMembersBlock_Server(props: FacultyMembersBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props

  const selectedFacultyRaw = props.selectedFaculty
  const selectedIds = Array.isArray(selectedFacultyRaw)
    ? selectedFacultyRaw.flatMap((v) => {
        if (typeof v === 'string' || typeof v === 'number') return [v]
        if (v && typeof v === 'object') {
          const id = v.id
          if (typeof id === 'string' || typeof id === 'number') return [id]
        }
        return []
      })
    : []

  const members = await getPublicFacultyList({
    limit: clampLimit(maxItems),
    locale,
    selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
    readContext: props.readContext,
  })

  return (
    <FacultyGridSection
      members={members}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer ?? false}
    />
  )
}
