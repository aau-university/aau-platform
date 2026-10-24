import { describe, expect, it } from 'vitest'

import {
  MAIN_NAV,
  PUBLIC_ROUTES,
  getMainNav,
  getPublicRouteLabel,
} from '@/lib/site/public-routes'

function expectNoLegacyLocaleFields(value: object) {
  for (const key of Object.keys(value)) {
    expect(key).not.toMatch(/(?:Ar|En)$/)
  }
}
describe('public routes', () => {
  it('PUBLIC_ROUTES has the 8 legacy primary nav items', () => {
    const keys = PUBLIC_ROUTES.map((r) => r.key)
    expect(keys).toEqual([
      'home',
      'about',
      'colleges',
      'campus-life',
      'research',
      'news',
      'admission',
      'contact',
    ])
  })

  it('every entry has locale-keyed labels and a relative href', () => {
    for (const item of PUBLIC_ROUTES) {
      expectNoLegacyLocaleFields(item)
      expect(item.labels?.ar).toBeTruthy()
      expect(item.labels?.en).toBeTruthy()
      expect(item.href.startsWith('/')).toBe(true)
      // No accidental /ar or /en prefixes.
      expect(item.href.startsWith('/ar')).toBe(false)
      expect(item.href.startsWith('/en')).toBe(false)
    }
  })

  it('resolves legacy Arabic and English labels without storing xAr/xEn fields', () => {
    const home = PUBLIC_ROUTES.find((r) => r.key === 'home')
    expect(home).toBeDefined()
    expect(getPublicRouteLabel(home!, 'ar')).toBe('الرئيسية')
    expect(getPublicRouteLabel(home!, 'en')).toBe('Home')
    expect(getMainNav('ar')[0]).toMatchObject({ key: 'home', label: 'الرئيسية' })
    expect(getMainNav('en')[0]).toMatchObject({ key: 'home', label: 'Home' })
  })

  it('MAIN_NAV is the subset flagged inMainNav', () => {
    expect(MAIN_NAV.every((r) => r.inMainNav)).toBe(true)
    expect(MAIN_NAV.length).toBe(PUBLIC_ROUTES.filter((r) => r.inMainNav).length)
  })
})

