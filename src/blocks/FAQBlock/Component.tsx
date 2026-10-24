import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicFAQs } from '@/lib/payload/get-public-faqs'
import { FAQSection } from '@/components/sections/FAQSection'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type FAQBlock = Extract<PageLayoutBlock, { blockType: 'faq' }>

function clampLimit(n?: number | null): number {
  if (typeof n !== 'number' || isNaN(n)) return 4
  return Math.max(1, Math.min(8, Math.trunc(n)))
}

export async function FAQBlock_Server(props: FAQBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const faqs = await getPublicFAQs({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <FAQSection faqs={faqs} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
