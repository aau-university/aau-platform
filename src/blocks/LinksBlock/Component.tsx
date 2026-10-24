import type { PageLayoutBlock } from '@/blocks/types'
import { QuickLinksSection } from '@/components/sections/QuickLinksSection'

type LinksBlock = Extract<PageLayoutBlock, { blockType: 'links' }>

export function LinksBlock_Server(
  props: LinksBlock & { disableInnerContainer?: boolean },
) {
  const { links, ...sectionContent } = props
  const items = Array.isArray(links) ? links : []

  return (
    <QuickLinksSection
      links={items}
      sectionContent={sectionContent}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
