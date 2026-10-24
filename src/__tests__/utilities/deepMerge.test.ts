import { describe, expect, it } from 'vitest'

import { deepMerge } from '@/utilities/deepMerge'

/**
 * Smoke test for the `@/utilities/deepMerge` re-export. Comprehensive
 * semantics coverage lives in `src/__tests__/fields/deepMerge.test.ts`.
 */
describe('deepMerge() (utilities re-export)', () => {
  it('merges flat objects', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 })
  })
})
