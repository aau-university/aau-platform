import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicEvents } from '@/lib/payload/get-public-events'
import { EventsGridSection } from '@/components/sections/EventsGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type EventsGridBlock = Extract<PageLayoutBlock, { blockType: 'eventsGrid' }>

function clampLimit(n?: number | null): number {
  if (typeof n !== 'number' || isNaN(n)) return 4
  return Math.max(1, Math.min(8, Math.trunc(n)))
}

export async function EventsGridSection_Server(props: EventsGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const events = await getPublicEvents({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <EventsGridSection events={events} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
