import { describe, expect, it } from 'vitest'

import { deepMerge } from '../../fields/deepMerge'

/**
 * Tests for the {@link deepMerge} utility.
 *
 * Semantics under test (per PR-005 spec):
 *   - Plain objects merged recursively.
 *   - Arrays REPLACED (not concatenated).
 *   - Primitives overwritten by the latest source.
 *   - `null` and `undefined` sources skipped.
 *
 * The target object must not be mutated.
 */

describe('deepMerge()', () => {
  it('merges flat objects', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('merges nested objects recursively', () => {
    expect(deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 3, z: 4 } })).toEqual({
      a: { x: 1, y: 3, z: 4 },
    })
  })

  it('REPLACES arrays (does not concatenate)', () => {
    expect(deepMerge({ tags: ['a', 'b'] }, { tags: ['c'] })).toEqual({ tags: ['c'] })
  })

  it('overwrites primitives with later sources', () => {
    expect(deepMerge({ n: 1 }, { n: 2 }, { n: 3 })).toEqual({ n: 3 })
  })

  it('overwrites an object with a primitive (and vice versa)', () => {
    expect(deepMerge({ a: { x: 1 } }, { a: 'string' })).toEqual({ a: 'string' })
    expect(deepMerge({ a: 'string' }, { a: { x: 1 } })).toEqual({ a: { x: 1 } })
  })

  it('skips null and undefined sources', () => {
    expect(deepMerge({ a: 1 }, null, undefined, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('does not mutate the target object', () => {
    const target = { a: { x: 1 }, b: 2 }
    deepMerge(target, { a: { y: 2 } })
    expect(target).toEqual({ a: { x: 1 }, b: 2 })
  })

  it('handles a non-object target by returning the last source', () => {
    expect(deepMerge(42 as unknown as Record<string, unknown>, { a: 1 })).toEqual({ a: 1 })
  })

  it('handles an empty target with object sources', () => {
    expect(deepMerge({}, { a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('handles no sources (returns target shallow-copied)', () => {
    const target = { a: 1, b: { c: 2 } }
    const result = deepMerge(target)
    expect(result).toEqual(target)
    expect(result).not.toBe(target) // shallow-copied
  })

  it('preserves keys only present in target', () => {
    expect(deepMerge({ a: 1, b: 2, c: 3 }, { b: 99 })).toEqual({ a: 1, b: 99, c: 3 })
  })

  it('handles deeply nested merge', () => {
    const target = { level1: { level2: { level3: { a: 1, b: 2 } } } }
    const source = { level1: { level2: { level3: { b: 3, c: 4 } } } }
    expect(deepMerge(target, source)).toEqual({
      level1: { level2: { level3: { a: 1, b: 3, c: 4 } } },
    })
  })

  it('overwrites arrays inside nested objects (replace, not concat)', () => {
    expect(
      deepMerge({ nested: { items: [1, 2, 3] } }, { nested: { items: [4, 5] } }),
    ).toEqual({ nested: { items: [4, 5] } })
  })
})
