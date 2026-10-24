import { RichTextSection } from '@/components/sections/RichTextSection'
import type { RichTextLayoutBlock } from '@/blocks/types'

export function RichTextRenderer(props: { block: RichTextLayoutBlock; disableInnerContainer?: boolean }) {
  return <RichTextSection block={props.block} disableInnerContainer={props.disableInnerContainer} />
}
