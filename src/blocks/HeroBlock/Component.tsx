import { HeroSection } from '@/components/sections/HeroSection'
import type { PageLayoutBlock } from '@/blocks/types'
import type { Locale } from '@/i18n/locale'
import { getPublicSiteSettings } from '@/lib/payload/get-public-site-settings'

type HeroBlock = Extract<PageLayoutBlock, { blockType: 'hero' }>

export { HeroSection }

export async function HeroBlock_Server(
  props: HeroBlock & { disableInnerContainer?: boolean; locale?: Locale },
) {
  const siteSettings = await getPublicSiteSettings(props.locale ?? 'ar')
  return (
    <HeroSection
      content={props}
      logo={siteSettings.logo}
      disableInnerContainer={props.disableInnerContainer}
    />
  )
}
