import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  LOCALES,
  getDirection,
  isLocale,
} from '../locale'

describe('locale primitives', () => {
  it('Arabic is the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('ar')
  })

  it('exports exactly ar and en', () => {
    expect(LOCALES).toEqual(['ar', 'en'])
  })

  it('exposes a stable cookie name', () => {
    expect(LANG_COOKIE).toBe('aau_lang')
  })

  it('isLocale narrows known values and rejects unknown ones', () => {
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale('')).toBe(false)
  })

  it('Arabic is RTL and English is LTR', () => {
    expect(getDirection('ar')).toBe('rtl')
    expect(getDirection('en')).toBe('ltr')
  })
})
