import { describe, expect, it } from 'vitest'

import { toKebabCase } from '@/utilities/toKebabCase'

/**
 * Smoke test for {@link toKebabCase}.
 */
describe('toKebabCase()', () => {
  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('camelCaseString')).toBe('camel-case-string')
  })

  it('converts PascalCase to kebab-case', () => {
    expect(toKebabCase('PascalCaseString')).toBe('pascal-case-string')
  })

  it('converts snake_case to kebab-case', () => {
    expect(toKebabCase('snake_case_string')).toBe('snake-case-string')
  })
})
