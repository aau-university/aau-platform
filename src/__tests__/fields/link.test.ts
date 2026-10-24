import type { NamedGroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { appearanceOptions, link } from '../../fields/link'

/**
 * Field-shape tests for the {@link link} factory.
 *
 * PR-005 adds `link()` in isolation — no collection/global/block consumes
 * it yet. These tests pin the returned GroupField shape so future consumers
 * (PR-007 blocks, PR-010/011 collections, PR-026 globals) can rely on it.
 *
 * The asserted shape mirrors the official Payload template's
 * `templates/website/src/fields/link.ts`, adapted for AAU:
 *   - no shared `interfaceName`, so each owner generates its actual variant
 *   - `name: 'link'`, `type: 'group'`
 *   - Inner fields: `type` (radio), `newTab` (checkbox), `reference`
 *     (relationship, default `['pages']`), `url` (text), `appearance` (select
 *     with 4 variants: default, secondary, ghost, outline)
 */

function asGroup(field: ReturnType<typeof link>): NamedGroupField {
  // `link()` always returns a NamedGroupField (it sets `name: 'link'`),
  // but the `GroupField` type is a union with `UnnamedGroupField` — cast
  // to the named variant so `.name` is readable.
  return field as NamedGroupField
}

function findField(group: NamedGroupField, name: string): Record<string, unknown> {
  const found = group.fields.find((f) => 'name' in f && (f as { name?: string }).name === name)
  if (!found) {
    throw new Error(`expected to find field named "${name}" in link group`)
  }
  return found as unknown as Record<string, unknown>
}

describe('link()', () => {
  it('returns a group field named "link" without a shared interfaceName', () => {
    const field = asGroup(link())
    expect(field.name).toBe('link')
    expect(field.type).toBe('group')
    expect(field.interfaceName).toBeUndefined()
  })

  it('exposes a `type` radio field with default/reference and custom options', () => {
    const group = asGroup(link())
    // The `type` field lives inside a row, so we need to flatten one level.
    const row = group.fields[0] as unknown as { type: string; fields: unknown[] }
    expect(row.type).toBe('row')
    const typeField = row.fields.find(
      (f) => (f as { name?: string; type?: string }).name === 'type',
    ) as { name: string; type: string; defaultValue: string; options: { value: string }[] }
    expect(typeField).toBeDefined()
    expect(typeField.type).toBe('radio')
    expect(typeField.defaultValue).toBe('reference')
    const optionValues = typeField.options.map((o) => o.value)
    expect(optionValues).toEqual(['reference', 'custom'])
  })

  it('exposes a `newTab` checkbox field', () => {
    const group = asGroup(link())
    const row = group.fields[0] as unknown as { type: string; fields: unknown[] }
    const newTabField = row.fields.find(
      (f) => (f as { name?: string; type?: string }).name === 'newTab',
    ) as { name: string; type: string }
    expect(newTabField).toBeDefined()
    expect(newTabField.type).toBe('checkbox')
  })

  it('exposes a `reference` relationship field with default relationTo=["pages"]', () => {
    const group = asGroup(link())
    const reference = findField(group, 'reference')
    expect(reference.type).toBe('relationship')
    expect(reference.relationTo).toEqual(['pages'])
    expect(reference.required).toBe(true)
  })

  it('exposes a `url` text field', () => {
    const group = asGroup(link())
    const url = findField(group, 'url')
    expect(url.type).toBe('text')
    expect(url.required).toBe(true)
  })

  it('exposes an `appearance` select field with all four variants by default', () => {
    const group = asGroup(link())
    const appearance = findField(group, 'appearance') as {
      type: string
      defaultValue: string
      options: { value: string }[]
    }
    expect(appearance.type).toBe('select')
    expect(appearance.defaultValue).toBe('default')
    expect(appearance.options.map((o) => o.value)).toEqual([
      'default',
      'secondary',
      'ghost',
      'outline',
    ])
  })

  it('omits the `appearance` field when `appearances: false`', () => {
    const group = asGroup(link({ appearances: false }))
    const appearance = group.fields.find(
      (f) => 'name' in f && (f as { name?: string }).name === 'appearance',
    )
    expect(appearance).toBeUndefined()
  })

  it('restricts the `appearance` options when `appearances` is a subset', () => {
    const group = asGroup(link({ appearances: ['default', 'outline'] }))
    const appearance = findField(group, 'appearance') as {
      options: { value: string }[]
    }
    expect(appearance.options.map((o) => o.value)).toEqual(['default', 'outline'])
  })

  it('forwards `relationTo` to the inner `reference` field', () => {
    const group = asGroup(link({ relationTo: ['pages', 'news'] }))
    const reference = findField(group, 'reference')
    expect(reference.relationTo).toEqual(['pages', 'news'])
  })

  it('applies `overrides` via deepMerge (e.g. rename to `cta`)', () => {
    const field = asGroup(link({ overrides: { name: 'cta' } }))
    expect(field.name).toBe('cta')
  })

  it('exposes the four canonical appearanceOptions labels', () => {
    expect(appearanceOptions.default.value).toBe('default')
    expect(appearanceOptions.secondary.value).toBe('secondary')
    expect(appearanceOptions.ghost.value).toBe('ghost')
    expect(appearanceOptions.outline.value).toBe('outline')
  })
})
