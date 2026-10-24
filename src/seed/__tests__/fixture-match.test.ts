import { describe, expect, it } from 'vitest'

import { expectFixtureLeaves } from '../../../tests/seed/assertions/fixture-match'

describe('fixture leaf assertions', () => {
  it.each([
    ['omitted', { link: {} }],
    ['undefined', { link: { reference: undefined } }],
    ['null', { link: { reference: null } }],
  ])('accepts an expected null when the actual leaf is %s', (_label, actual) => {
    expect(() =>
      expectFixtureLeaves(actual, { link: { reference: null } }),
    ).not.toThrow()
  })

  it('rejects a stale non-null value when the fixture expects null', () => {
    expect(() =>
      expectFixtureLeaves(
        { link: { reference: { relationTo: 'pages', value: 1 } } },
        { link: { reference: null } },
      ),
    ).toThrow()
  })

  it('still requires presence and equality for non-null fixture leaves', () => {
    expect(() => expectFixtureLeaves({ link: {} }, { link: { type: 'custom' } })).toThrow(
      'fixture.link.type must exist',
    )
    expect(() =>
      expectFixtureLeaves({ link: { type: 'reference' } }, { link: { type: 'custom' } }),
    ).toThrow()
  })
})
