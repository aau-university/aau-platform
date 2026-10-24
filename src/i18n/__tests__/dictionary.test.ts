import { describe, expect, it } from 'vitest'

import { getDictionary, translate } from '../dictionary'

describe('dictionary', () => {
  it('returns Arabic and English versions of common keys', () => {
    expect(translate('ar', 'common.applyNow')).toBe('التقديم الآن')
    expect(translate('en', 'common.applyNow')).toBe('Apply Now')
  })

  it('language toggle label points at the OTHER language', () => {
    // When the user is in Arabic the toggle should show "English" so the
    // user understands what clicking it will do.
    expect(translate('ar', 'common.languageToggle')).toBe('English')
    expect(translate('en', 'common.languageToggle')).toBe('العربية')
  })

  it('Arabic and English dictionaries cover the same keys', () => {
    const ar = getDictionary('ar')
    const en = getDictionary('en')
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort())
  })

  it('every value is a non-empty string', () => {
    for (const locale of ['ar', 'en'] as const) {
      const dict = getDictionary(locale)
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `${locale}/${key}`).toBe('string')
        expect(value.trim().length, `${locale}/${key}`).toBeGreaterThan(0)
      }
    }
  })
})
