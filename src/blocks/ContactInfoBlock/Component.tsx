import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicContactSettings } from '@/lib/payload/get-public-contact-settings'
import { ContactInfoSection } from '@/components/sections/ContactInfo'
import type { Locale } from '@/i18n/locale'

type ContactInfoBlock = Extract<PageLayoutBlock, { blockType: 'contactInfo' }>

export async function ContactCTASection(props: ContactInfoBlock & { locale?: Locale; disableInnerContainer?: boolean }) {
  const { locale = 'ar' } = props
  const settings = await getPublicContactSettings(locale)
  return <ContactInfoSection settings={settings} content={props} disableInnerContainer={props.disableInnerContainer} />
}
