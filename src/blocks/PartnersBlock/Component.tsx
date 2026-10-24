import { PartnersSection } from '@/components/sections/PartnersSection'
import type { PageLayoutBlock } from '@/blocks/types'

type PartnersBlock = Extract<PageLayoutBlock, { blockType: 'partners' }>

export function PartnersBlock_Server(props: PartnersBlock & { disableInnerContainer?: boolean }) {
  const raw = props.partners
  const partners = Array.isArray(raw) ? raw : []
  return (
    <PartnersSection
      partners={partners as Parameters<typeof PartnersSection>[0]['partners']}
      sectionContent={props}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
