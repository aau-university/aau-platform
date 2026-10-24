import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { Page } from '@/payload-types'

import { RenderHero } from '@/heros/RenderHero'

// Vitest config does not enable `globals: true`, so @testing-library/react's
// auto-cleanup (which relies on a global `afterEach`) does not run. We
// register cleanup explicitly to keep each test's DOM isolated.
afterEach(() => {
  cleanup()
})

/**
 * Smoke tests for the {@link RenderHero} dispatcher.
 *
 * PR-009 ports the official Payload template's heros system. The dispatcher
 * routes a hero group to one of four variant components based on `hero.type`,
 * and renders nothing when the hero data is nullish. These tests pin that
 * contract: each variant is reachable through the dispatcher, and null hero
 * data does not crash.
 *
 * The variant components expose `data-testid` attributes
 * (`high-impact-hero`, `medium-impact-hero`, `low-impact-hero`,
 * `post-hero`) so the dispatcher's routing can be asserted without coupling
 * to the variants' internal DOM.
 */
describe('RenderHero', () => {
  it('renders HighImpactHero when hero.type === "highImpact"', () => {
    const hero = {
      type: 'highImpact' as const,
      richText: null,
      links: [],
      media: null,
    } as unknown as Page['hero']

    const { getByTestId, queryByTestId } = render(<RenderHero hero={hero} />)

    expect(getByTestId('high-impact-hero')).toBeDefined()
    expect(queryByTestId('medium-impact-hero')).toBeNull()
    expect(queryByTestId('low-impact-hero')).toBeNull()
    expect(queryByTestId('post-hero')).toBeNull()
  })

  it('renders MediumImpactHero when hero.type === "mediumImpact"', () => {
    const hero = {
      type: 'mediumImpact' as const,
      richText: null,
      links: [],
      media: null,
    } as unknown as Page['hero']

    const { getByTestId } = render(<RenderHero hero={hero} />)

    expect(getByTestId('medium-impact-hero')).toBeDefined()
  })

  it('renders LowImpactHero when hero.type === "lowImpact"', () => {
    const hero = {
      type: 'lowImpact' as const,
      richText: null,
      links: [],
      media: null,
    } as unknown as Page['hero']

    const { getByTestId } = render(<RenderHero hero={hero} />)

    expect(getByTestId('low-impact-hero')).toBeDefined()
  })

  it('renders PostHero when hero.type === "postHero"', () => {
    const hero = {
      type: 'postHero' as const,
      richText: null,
      links: [],
      media: null,
    } as unknown as Page['hero']

    const { container, getByTestId } = render(<RenderHero hero={hero} />)

    expect(getByTestId('post-hero')).toBeDefined()
    expect(container.querySelector('.bg-gradient-to-t')).not.toBeNull()
  })

  it('renders nothing when hero === null', () => {
    const { container } = render(<RenderHero hero={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when hero === undefined', () => {
    const { container } = render(<RenderHero hero={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('falls back to LowImpactHero when hero.type is undefined', () => {
    const hero = {
      type: undefined,
      richText: null,
      links: [],
      media: null,
    } as unknown as Page['hero']

    const { getByTestId } = render(<RenderHero hero={hero} />)

    expect(getByTestId('low-impact-hero')).toBeDefined()
  })
})
