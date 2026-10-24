import { VideoSection } from '@/components/sections/VideoSection'
import type { PageLayoutBlock } from '@/blocks/types'

type VideoBlock = Extract<PageLayoutBlock, { blockType: 'video' }>

export function VideoBlock_Server(props: VideoBlock & { disableInnerContainer?: boolean }) {
  return <VideoSection content={props} disableInnerContainer={props.disableInnerContainer} />
}
