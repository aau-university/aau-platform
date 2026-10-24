import { describe, expect, it } from 'vitest'

import { FooterSettings } from '@/globals/FooterSettings'
import { NavbarSettings } from '@/globals/NavbarSettings'

import { navigationMenuFixtures } from '../fixtures/cms'
import { footerSettingsFixture } from '../fixtures/globals'

describe('dead global controls', () => {
  it('removes unused settings while preserving active navigation sources', () => {
    expect(fieldNames(NavbarSettings.fields)).not.toEqual(
      expect.arrayContaining(['navbarSearch', 'bannerHtml', 'mainMenu']),
    )
    expect(fieldNames(FooterSettings.fields)).not.toContain('footerMenu')
    expect(FooterSettings.fields.some((field) => 'name' in field && field.name === 'footerItems')).toBe(
      true,
    )
    expect(footerSettingsFixture.ar.footerItems).not.toHaveLength(0)
    expect(navigationMenuFixtures.map(({ key }) => key)).toEqual(['main'])
  })
})

function fieldNames(fields: typeof NavbarSettings.fields): string[] {
  return fields.flatMap((field) => ('name' in field ? [field.name] : []))
}
