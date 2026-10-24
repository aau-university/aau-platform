import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicSliders } from '@/lib/payload/get-public-sliders'
import { SliderSection } from '@/components/sections/SliderSection'
import type { Locale } from '@/i18n/locale'

type SliderBlock = Extract<PageLayoutBlock, { blockType: 'slider' }>

function clampLimit(n?: number | null, fallback = 5): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(10, Math.trunc(n)))
}

export async function SliderBlock_Server(
  props: SliderBlock & { locale?: Locale; disableInnerContainer?: boolean },
) {
  const { maxItems, locale = 'ar' } = props
  const autoplay = props.autoplay ?? true
  const interval = props.interval ?? 5000
  const items = await getPublicSliders({
    locale,
    limit: clampLimit(maxItems),
  })

  if (items.length === 0) return null

  return (
    <SliderSection
      items={items}
      autoplay={autoplay}
      interval={interval}
    />
  )
}
