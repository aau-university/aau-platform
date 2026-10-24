import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicTeamMembers } from '@/lib/payload/get-public-team-members'
import { TeamMembersGridSection } from '@/components/sections/TeamMembersGrid'
import type { Locale } from '@/i18n/locale'

type TeamMembersBlock = Extract<PageLayoutBlock, { blockType: 'teamMembers' }>

function clampLimit(n?: number | null, fallback = 12): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(20, Math.trunc(n)))
}

export async function TeamMembersSection(props: TeamMembersBlock & { locale?: Locale; disableInnerContainer?: boolean }) {
  const { maxItems, locale = 'ar' } = props

  const selectedMembersRaw = props.selectedMembers
  const selectedIds = Array.isArray(selectedMembersRaw)
    ? selectedMembersRaw.flatMap((v) => {
        if (typeof v === 'string' || typeof v === 'number') return [v]
        if (v && typeof v === 'object') {
          const id = v.id
          if (typeof id === 'string' || typeof id === 'number') return [id]
        }
        return []
      })
    : []

  const groupFilter = typeof props.groupFilter === 'string' ? props.groupFilter : undefined

  const members = await getPublicTeamMembers({
    limit: clampLimit(maxItems),
    locale,
    selectedIds: selectedIds.length > 0 ? selectedIds : undefined,
    group: groupFilter,
  })

  return (
    <TeamMembersGridSection
      members={members}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
