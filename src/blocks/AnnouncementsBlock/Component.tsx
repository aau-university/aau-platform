import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicAnnouncements } from '@/lib/payload/get-public-announcements'
import { AnnouncementsSection } from '@/components/sections/AnnouncementsSection'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type AnnouncementsBlock = Extract<PageLayoutBlock, { blockType: 'announcements' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function AnnouncementsBlock_Server(props: AnnouncementsBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const items = await getPublicAnnouncements({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return (
    <AnnouncementsSection
      items={items}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer}
      locale={locale}
    />
  )
}
