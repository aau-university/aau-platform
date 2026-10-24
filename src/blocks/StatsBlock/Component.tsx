import { StatsSection } from '@/components/sections/StatsSection'
import type { HomeFallbackStat } from '@/lib/fallback/home-fallback-data'
import type { PageLayoutBlock } from '@/blocks/types'
import type { Locale } from '@/i18n/locale'

type StatsBlock = Extract<PageLayoutBlock, { blockType: 'stats' }>

function safeStats(items: unknown): HomeFallbackStat[] {
  // No CMS items → no section. The old fallback rendered invented
  // statistics (+10,000 students, …) to visitors as if they were real.
  if (!Array.isArray(items) || items.length === 0) return []
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as {
      icon?: unknown
      key?: unknown
      number?: unknown
      label?: unknown
    }
    const icon = record.icon
    if (
      icon !== 'students' &&
      icon !== 'faculty' &&
      icon !== 'programs' &&
      icon !== 'colleges'
    ) {
      return []
    }
    const key = record.key
    const statKey =
      key === 'students' || key === 'faculty' || key === 'programs' || key === 'colleges'
        ? key
        : icon
    return [
      {
        key: statKey,
        icon,
        number: typeof record.number === 'string' ? record.number : '',
        label: typeof record.label === 'string' ? record.label : '',
      },
    ]
  })
}

export { StatsSection }

export function StatsBlock_Server(props: StatsBlock & { locale?: Locale; disableInnerContainer?: boolean }) {
  const { items, disableInnerContainer = false } = props
  const stats = safeStats(items)
  if (stats.length === 0) return null
  return <StatsSection stats={stats} disableInnerContainer={disableInnerContainer} />
}
