import type { BlocksField } from 'payload'
import { describe, expect, it } from 'vitest'

import { block } from '../../fields/block'

/**
 * Smoke tests for the {@link block} factory.
 *
 * PR-005 adds `block()` in isolation — no collection/global/block consumes
 * it yet. These tests pin the returned BlocksField shape.
 */

const HERO_BLOCK = {
  slug: 'hero',
  fields: [{ name: 'title', type: 'text' as const }],
}
const CTA_BLOCK = {
  slug: 'cta',
  fields: [{ name: 'label', type: 'text' as const }],
}

describe('block()', () => {
  it('returns a blocks field named "blocks" by default', () => {
    const field = block({ blocks: [HERO_BLOCK] }) as BlocksField
    expect(field.type).toBe('blocks')
    expect(field.name).toBe('blocks')
  })

  it('exposes the provided blocks array', () => {
    const field = block({ blocks: [HERO_BLOCK, CTA_BLOCK] }) as BlocksField
    expect(field.blocks).toHaveLength(2)
    expect(field.blocks[0].slug).toBe('hero')
    expect(field.blocks[1].slug).toBe('cta')
  })

  it('defaults admin.initCollapsed to true', () => {
    const field = block({ blocks: [HERO_BLOCK] }) as BlocksField
    expect(field.admin?.initCollapsed).toBe(true)
  })

  it('defaults required to undefined (falsy) when not provided', () => {
    const field = block({ blocks: [HERO_BLOCK] }) as BlocksField
    expect(field.required).toBeFalsy()
  })

  it('sets required: true when the `required` option is true', () => {
    const field = block({ blocks: [HERO_BLOCK], required: true }) as BlocksField
    expect(field.required).toBe(true)
  })

  it('applies `overrides` via deepMerge (rename to "layout")', () => {
    const field = block({
      blocks: [HERO_BLOCK],
      overrides: { name: 'layout' },
    }) as BlocksField
    expect(field.name).toBe('layout')
  })

  it('applies `overrides` for maxRows', () => {
    const field = block({
      blocks: [HERO_BLOCK],
      overrides: { maxRows: 3 },
    }) as BlocksField
    expect(field.maxRows).toBe(3)
  })
})
