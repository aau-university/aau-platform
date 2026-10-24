import type { FooterSetting, NavbarSetting, Page, Slider } from '@/payload-types'
import { describe, expect, it } from 'vitest'

type HasAppearance<T> = 'appearance' extends keyof T ? true : false
type Expect<T extends true> = T
type ExpectFalse<T extends false> = T

type HeroLink = NonNullable<
  NonNullable<NonNullable<Page['hero']>['links']>[number]['link']
>
type NavbarCallToActionLink = NonNullable<NavbarSetting['callToAction']>
type NavbarTopBarLink = NonNullable<
  NonNullable<NavbarSetting['topBarItems']>[number]['link']
>
type FooterItemLink = NonNullable<
  NonNullable<FooterSetting['footerItems']>[number]['link']
>
type SliderLink = NonNullable<Slider['link']>

type HeroHasAppearance = Expect<HasAppearance<HeroLink>>
type NavbarCallToActionHasAppearance = Expect<HasAppearance<NavbarCallToActionLink>>
type NavbarTopBarOmitsAppearance = ExpectFalse<HasAppearance<NavbarTopBarLink>>
type FooterItemOmitsAppearance = ExpectFalse<HasAppearance<FooterItemLink>>
type SliderOmitsAppearance = ExpectFalse<HasAppearance<SliderLink>>

describe('generated owner-specific link types', () => {
  it('keeps appearance only on owners whose field variant enables it', () => {
    const contracts: [
      HeroHasAppearance,
      NavbarCallToActionHasAppearance,
      NavbarTopBarOmitsAppearance,
      FooterItemOmitsAppearance,
      SliderOmitsAppearance,
    ] = [true, true, false, false, false]

    expect(contracts).toEqual([true, true, false, false, false])
  })
})
