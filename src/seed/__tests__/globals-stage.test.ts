import { describe, expect, it, vi } from 'vitest'

import { teamMemberFixtures } from '../fixtures/content'
import { footerSettingsFixture } from '../fixtures/globals'
import type { SeedOperations } from '../lib/local-api'
import { parseInitializeGlobals } from '../run-seed'
import { fixtureGlobalSlugs, globalsStage } from '../stages/globals'
import {
  context,
  dependencyFind,
  pristine,
  state,
  updateGlobalWithIds,
} from './globals-stage.test-helpers'

describe('globals stage', () => {
  it('parses only the exact string true as initialization opt-in', () => {
    expect(parseInitializeGlobals('true')).toBe(true)
    for (const value of [undefined, '', 'TRUE', 'True', ' true', 'true ', '1', 'yes']) {
      expect(parseInitializeGlobals(value)).toBe(false)
    }
  })

  it('performs no global or relationship reads and reports seven visible skips when disabled', async () => {
    const operations = {
      find: vi.fn(),
      findGlobalAllLocales: vi.fn(),
      updateGlobal: vi.fn(),
    }
    const result = await globalsStage.run(context(operations, state()))

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 7, updated: 0 })
    expect(operations.findGlobalAllLocales).not.toHaveBeenCalled()
    expect(operations.find).not.toHaveBeenCalled()
    expect(operations.updateGlobal).not.toHaveBeenCalled()
  })

  it('initializes all seven pristine globals with typed locale sequences', async () => {
    const events: string[] = []
    const findGlobalAllLocales = vi.fn(async ({ slug }) => {
      events.push(`global:${slug}`)
      return structuredClone(pristine[slug as keyof typeof pristine])
    })
    const find = dependencyFind()
    find.mockImplementation(async (args) => {
      events.push(`dependency:${args.collection}`)
      if (args.collection === 'team-members') {
        const slug = args.where.slug.equals
        const index = teamMemberFixtures.findIndex((fixture) => fixture.slug === slug)
        return { docs: [{ id: 100 + index, slug }], totalDocs: 1 }
      }
      const key = args.where.key.equals
      return { docs: [{ id: key === 'main' ? 201 : 202, key }], totalDocs: 1 }
    })
    const updateGlobal = updateGlobalWithIds()

    const result = await globalsStage.run(
      context(
        { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
        state({ initializeGlobals: true }),
      ),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 7 })
    expect(findGlobalAllLocales.mock.calls.map(([args]) => args.slug)).toEqual(fixtureGlobalSlugs)
    expect(findGlobalAllLocales.mock.calls.every(([args]) => args.depth === 0)).toBe(true)
    expect(updateGlobal.mock.calls.map(([args]) => [args.slug, args.locale])).toEqual([
      ['site-settings', 'ar'],
      ['site-settings', 'en'],
      ['about-page', 'ar'],
      ['about-page', 'en'],
      ['contact-settings', 'ar'],
      ['contact-settings', 'en'],
      ['smart-chat-settings', undefined],
      ['navbar-settings', undefined],
      ['footer-settings', 'ar'],
      ['footer-settings', 'en'],
      ['analytics-settings', undefined],
    ])
    expect(updateGlobal).toHaveBeenCalledTimes(11)
    expect(updateGlobal.mock.calls.some(([args]) => args.slug === 'dashboard-metrics')).toBe(false)
    expect(updateGlobal.mock.calls[2]?.[0].data.teamMembersRelationship).toEqual(
      teamMemberFixtures.map((_, index) => 100 + index),
    )
    expect(Object.keys(updateGlobal.mock.calls[1]?.[0].data).sort()).toEqual([
      'description',
      'siteName',
      'tagline',
    ])
    expect(Object.keys(updateGlobal.mock.calls[3]?.[0].data).sort()).toEqual([
      'goals',
      'header',
      'intro',
      'mission',
      'president',
      'teamSection',
      'values',
      'vision',
    ])
    expect(updateGlobal.mock.calls[3]?.[0].data).not.toHaveProperty('teamMembers')
    expect(updateGlobal.mock.calls[3]?.[0].data).not.toHaveProperty('teamMembersRelationship')
    expect(Object.keys(updateGlobal.mock.calls[5]?.[0].data).sort()).toEqual([
      'formLabels',
      'page',
    ])
    expect(updateGlobal.mock.calls[7]?.[0].slug).toBe('navbar-settings')
    expect(updateGlobal.mock.calls[7]?.[0]).not.toHaveProperty('locale')
    expect(updateGlobal.mock.calls[7]?.[0].data).toMatchObject({ topBarItems: [] })
    expect(updateGlobal.mock.calls[8]?.[0].data.footerItems[0]).toMatchObject({
      label: footerSettingsFixture.ar.footerItems[0]?.label,
      link: footerSettingsFixture.ar.footerItems[0]?.link,
    })
    expect(Object.keys(updateGlobal.mock.calls[9]?.[0].data)).toEqual(['footerItems'])
    expect(
      updateGlobal.mock.calls[9]?.[0].data.footerItems.every(
        (row: Record<string, unknown>) =>
          Object.keys(row).sort().join(',') === 'id,label' && !('link' in row) && !('group' in row),
      ),
    ).toBe(true)
    expect(events.indexOf('global:about-page')).toBeLessThan(events.indexOf('dependency:team-members'))
    expect(events).not.toContain('dependency:navigation-menus')
  })

  it('reports each non-pristine global as an editor-owned conflict with zero writes or resolutions', async () => {
    const findGlobalAllLocales = vi.fn(async ({ slug }) => ({
      ...structuredClone(pristine[slug as keyof typeof pristine]),
      editorSentinel: true,
    }))
    const find = vi.fn()
    const updateGlobal = vi.fn()

    const result = await globalsStage.run(
      context(
        { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
        state({ initializeGlobals: true }),
      ),
    )

    expect(result).toEqual({ conflict: 7, created: 0, skipped: 0, updated: 0 })
    expect(findGlobalAllLocales).toHaveBeenCalledTimes(7)
    expect(find).not.toHaveBeenCalled()
    expect(updateGlobal).not.toHaveBeenCalled()
  })

  it('fails relationship resolution after eligibility and before any writes', async () => {
    const findGlobalAllLocales = vi.fn().mockResolvedValue(pristine['about-page'])
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0 })
    const updateGlobal = vi.fn()

    await expect(
      globalsStage.run(
        context(
          { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
          state({ initializeGlobals: true, resetTarget: 'about-page' }),
        ),
      ),
    ).rejects.toThrow('Missing or ambiguous team-members dependency')
    expect(findGlobalAllLocales).toHaveBeenCalledOnce()
    expect(find).toHaveBeenCalledOnce()
    expect(updateGlobal).not.toHaveBeenCalled()
  })

})
