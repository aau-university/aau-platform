import type { ArrayField, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { linkGroup } from '../../fields/linkGroup'

/**
 * Field-shape tests for the {@link linkGroup} factory.
 *
 * PR-005 adds `linkGroup()` in isolation — no collection/global/block
 * consumes it yet. These tests pin the returned ArrayField shape so future
 * consumers (PR-007 blocks, PR-010/011 collections, PR-026 globals) can
 * rely on it.
 */

function asArray(field: Field): ArrayField {
  return field as ArrayField
}

describe('linkGroup()', () => {
  it('returns an array field named "links"', () => {
    const field = asArray(linkGroup())
    expect(field.name).toBe('links')
    expect(field.type).toBe('array')
  })

  it('uses the canonical link() group as its single row field', () => {
    const field = asArray(linkGroup())
    expect(field.fields).toHaveLength(1)
    const inner = field.fields[0] as unknown as { name: string; type: string; interfaceName?: string }
    expect(inner.name).toBe('link')
    expect(inner.type).toBe('group')
    expect(inner.interfaceName).toBeUndefined()
  })

  it('defaults to admin.initCollapsed = true', () => {
    const field = asArray(linkGroup())
    expect(field.admin?.initCollapsed).toBe(true)
  })

  it('forwards `appearances: false` to the inner link() (no appearance field)', () => {
    const field = asArray(linkGroup({ appearances: false }))
    const inner = field.fields[0] as unknown as { fields: { name?: string }[] }
    const hasAppearance = inner.fields.some((f) => f.name === 'appearance')
    expect(hasAppearance).toBe(false)
  })

  it('forwards `relationTo` to the inner link() reference field', () => {
    const field = asArray(linkGroup({ relationTo: 'news' }))
    const inner = field.fields[0] as unknown as { fields: { name?: string; relationTo?: unknown }[] }
    const reference = inner.fields.find((f) => f.name === 'reference')
    expect(reference?.relationTo).toEqual(['news'])
  })

  it('applies `overrides` via deepMerge (e.g. set maxRows)', () => {
    const field = asArray(linkGroup({ overrides: { maxRows: 5 } }))
    expect(field.maxRows).toBe(5)
  })

  it('applies `overrides` to rename the array (e.g. "buttons")', () => {
    const field = asArray(linkGroup({ overrides: { name: 'buttons' } }))
    expect(field.name).toBe('buttons')
  })
})
