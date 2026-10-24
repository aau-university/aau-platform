import { CTASection } from '@/components/sections/CTASection'
import type { CTALayoutBlock } from '@/blocks/types'

export function CTARenderer(props: { block: CTALayoutBlock; disableInnerContainer?: boolean }) {
  return <CTASection block={props.block} disableInnerContainer={props.disableInnerContainer} />
}
