import { describe, expect, it } from 'vitest'

import { graftLocalizedRowIds, UnsafeLocalizedRowTopologyError } from '../lib/localized-row-ids'

describe('graftLocalizedRowIds', () => {
  it('rejects keyed omission and addition in strict mode', () => {
    const persisted = {
      items: [
        { id: 'item-a', key: 'a' },
        { id: 'item-b', key: 'b' },
      ],
    }
    const schema = { items: { keyField: 'key' } }

    expect(() => graftLocalizedRowIds(persisted, { items: [{ key: 'a' }] }, schema)).toThrow(
      UnsafeLocalizedRowTopologyError,
    )
    expect(() =>
      graftLocalizedRowIds(
        persisted,
        { items: [{ key: 'a' }, { key: 'b' }, { key: 'c' }] },
        schema,
      ),
    ).toThrow(UnsafeLocalizedRowTopologyError)
  })

  it('explicit reset mode preserves matching IDs across keyed reorder, addition, and removal', () => {
    const persisted = {
      items: [
        {
          id: 'item-a',
          key: 'a',
          children: [
            { id: 'child-a-1', key: 'a-1', label: 'Arabic one' },
            { id: 'child-a-2', key: 'a-2', label: 'Arabic two' },
          ],
        },
        { id: 'item-b', key: 'b', children: [] },
      ],
    }
    const localized = {
      items: [
        { key: 'b', children: [] },
        { key: 'c', children: [{ key: 'c-1', label: 'New' }] },
        {
          key: 'a',
          children: [
            { key: 'a-2', label: 'English two' },
            { key: 'a-3', label: 'New child' },
          ],
        },
      ],
    }

    const result = graftLocalizedRowIds(
      persisted,
      localized,
      {
        items: {
          keyField: 'key',
          rows: { children: { keyField: 'key' } },
        },
      },
      { mode: 'reset' },
    )

    expect(result).toEqual({
      items: [
        { id: 'item-b', key: 'b', children: [] },
        { key: 'c', children: [{ key: 'c-1', label: 'New' }] },
        {
          id: 'item-a',
          key: 'a',
          children: [
            { id: 'child-a-2', key: 'a-2', label: 'English two' },
            { key: 'a-3', label: 'New child' },
          ],
        },
      ],
    })
    expect(localized.items[0]).not.toHaveProperty('id')
  })

  it('strictly grafts every generated reset ID into the second locale', () => {
    const schema = {
      items: {
        keyField: 'key',
        rows: { children: { keyField: 'key' } },
      },
    }
    const persistedBeforeReset = {
      items: [{ id: 'item-a', key: 'a', children: [] }],
    }
    const arabicReset = {
      items: [
        { key: 'b', children: [{ key: 'b-1', label: 'Arabic child' }] },
        { key: 'a', children: [] },
      ],
    }
    const firstLocaleWrite = graftLocalizedRowIds(persistedBeforeReset, arabicReset, schema, {
      mode: 'reset',
    })
    const persistedFirstLocaleResult = {
      items: firstLocaleWrite.items.map((item) =>
        item.key === 'b'
          ? {
              ...item,
              children: item.children.map((child) => ({ ...child, id: 'child-b-1' })),
              id: 'item-b',
            }
          : item,
      ),
    }

    const english = graftLocalizedRowIds(
      persistedFirstLocaleResult,
      {
        items: [
          { key: 'a', children: [] },
          { key: 'b', children: [{ key: 'b-1', label: 'English child' }] },
        ],
      },
      schema,
    )

    expect(english).toEqual({
      items: [
        { children: [], id: 'item-a', key: 'a' },
        {
          children: [{ id: 'child-b-1', key: 'b-1', label: 'English child' }],
          id: 'item-b',
          key: 'b',
        },
      ],
    })
  })

  it('rejects an unsafe positional graft when unkeyed topology differs', () => {
    const persisted = {
      layout: [
        { blockType: 'hero', id: 'hero-1' },
        { blockType: 'richText', id: 'text-1' },
      ],
    }
    const localized = {
      layout: [{ blockType: 'hero', heading: 'English' }],
    }

    expect(() => graftLocalizedRowIds(persisted, localized, { layout: {} })).toThrow(
      UnsafeLocalizedRowTopologyError,
    )
  })

  it('allows reset to clear a stale persisted array to the canonical empty array', () => {
    expect(
      graftLocalizedRowIds(
        { stats: [{ id: 'stale-stat', label: 'Stale', value: 99 }] },
        { stats: [] },
        { stats: {} },
        { mode: 'reset' },
      ),
    ).toEqual({ stats: [] })
  })

  it('keeps non-empty unkeyed reset topology strict', () => {
    expect(() =>
      graftLocalizedRowIds(
        { stats: [{ id: 'stat-1', value: 1 }] },
        { stats: [{ value: 1 }, { value: 2 }] },
        { stats: {} },
        { mode: 'reset' },
      ),
    ).toThrow('unkeyed row counts differ')

    expect(() =>
      graftLocalizedRowIds(
        {},
        { stats: [{ value: 1 }] },
        { stats: {} },
        { mode: 'reset' },
      ),
    ).toThrow('persisted row array is missing')
  })

  it('rejects duplicate persisted row IDs before grafting either locale', () => {
    expect(() =>
      graftLocalizedRowIds(
        {
          tags: [
            { id: 'duplicate', tag: 'أول' },
            { id: 'duplicate', tag: 'ثان' },
          ],
        },
        { tags: [{ tag: 'First' }, { tag: 'Second' }] },
        { tags: {} },
      ),
    ).toThrow('duplicate persisted row ID')
  })

  it.each([
    ['empty string', ''],
    ['whitespace string', ' \t\n '],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
    ['non-integer number', 1.5],
    ['unsafe positive integer', Number.MAX_SAFE_INTEGER + 1],
    ['unsafe negative integer', Number.MIN_SAFE_INTEGER - 1],
  ])('rejects a persisted %s row ID before grafting', (_label, id) => {
    expect(() =>
      graftLocalizedRowIds(
        { items: [{ id }] },
        { items: [{ label: 'Localized' }] },
        { items: {} },
      ),
    ).toThrow('persisted row has no ID')
  })

  it('preserves non-empty string and safe integer IDs at numeric boundaries', () => {
    const ids = [' row-id ', Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]

    expect(
      graftLocalizedRowIds(
        { items: ids.map((id) => ({ id })) },
        { items: ids.map(() => ({ label: 'Localized' })) },
        { items: {} },
      ).items.map((row) => (row as typeof row & { id: string | number }).id),
    ).toEqual(ids)
  })
})
