import { AdmissionCTASection } from '@/components/sections/AdmissionCTA'
import type { PageLayoutBlock } from '@/blocks/types'

type AdmissionCTABlock = Extract<PageLayoutBlock, { blockType: 'admissionCTA' }>

export function AdmissionCTABlock_Server(props: AdmissionCTABlock & { disableInnerContainer?: boolean }) {
  return <AdmissionCTASection content={props} disableInnerContainer={props.disableInnerContainer} />
}
