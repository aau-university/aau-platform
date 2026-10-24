import { describe, expect, it, vi } from 'vitest'

import { teamMemberFixtures } from '../fixtures/content'
import { aboutPageFixture, footerSettingsFixture } from '../fixtures/globals'
import type { SeedOperations } from '../lib/local-api'
import { globalsStage } from '../stages/globals'
import {
  context,
  dependencyFind,
  pristine,
  state,
  updateGlobalWithIds,
} from './globals-stage.test-helpers'

describe('globals stage', () => {
  it('resets About with complete nested Arabic groups and localized-only English data', async () => {
    const findGlobalAllLocales = vi.fn().mockResolvedValue({
      ...pristine['about-page'],
      teamMembers: [
        {
          displayOrder: 999,
          fullName: { ar: 'عضو محرر' },
          groupName: { ar: 'مجموعة محرر' },
          id: 'editor-inline-row',
          jobTitle: { ar: 'دور محرر' },
          memberImage: null,
        },
      ],
    })
    const find = dependencyFind()
    const updateGlobal = vi.fn(async ({ data }) => data)

    const result = await globalsStage.run(
      context(
        { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
        state({ resetTarget: 'about-page' }),
      ),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 1 })
    expect(updateGlobal).toHaveBeenCalledTimes(2)
    const arabic = updateGlobal.mock.calls[0]?.[0]
    const english = updateGlobal.mock.calls[1]?.[0]
    expect(arabic.data).toEqual({
      ...aboutPageFixture.shared,
      ...aboutPageFixture.ar,
      intro: { ...aboutPageFixture.ar.intro, image: null },
      president: { ...aboutPageFixture.ar.president, image: null },
      teamMembers: [],
      teamMembersRelationship: teamMemberFixtures.map((_, index) => 100 + index),
    })
    expect(english.data).toEqual(aboutPageFixture.en)
    expect(english.data).not.toHaveProperty('teamMembers')
    expect(english.data).not.toHaveProperty('teamMembersRelationship')
  })

  it('resets Navbar with one shared write and no locale-owned payload', async () => {
    const findGlobalAllLocales = vi.fn().mockResolvedValue({
      ...pristine['navbar-settings'],
      hideLogin: true,
    })
    const find = dependencyFind()
    const updateGlobal = vi.fn(async ({ data }) => data)

    const result = await globalsStage.run(
      context(
        { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
        state({ resetTarget: 'navbar-settings' }),
      ),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 1 })
    expect(updateGlobal).toHaveBeenCalledOnce()
    const args = updateGlobal.mock.calls[0]?.[0]
    expect(args).not.toHaveProperty('locale')
    expect(args.data).toEqual({
      callToAction: {
        appearance: 'default',
        newTab: false,
        reference: null,
        type: 'custom',
        url: '/admission',
      },
      hideLogin: false,
      showLanguagePicker: true,
      topBarItems: [],
    })
  })

  it('resets only Footer, clears omitted fields, and preserves row IDs across locales', async () => {
    const footerItems = footerSettingsFixture.ar.footerItems.map((row, index) => ({
      ...row,
      id: `persisted-${index}`,
      label: { ar: row.label, en: footerSettingsFixture.en.footerItems[index]?.label },
    }))
    const findGlobalAllLocales = vi.fn().mockResolvedValue({
      ...pristine['footer-settings'],
      footerItems,
      address: { ar: 'edited', en: 'edited' },
      footerPowered: { ar: 'edited', en: 'edited' },
    })
    const find = dependencyFind()
    const updateGlobal = updateGlobalWithIds()

    const result = await globalsStage.run(
      context(
        { find, findGlobalAllLocales, updateGlobal } as unknown as SeedOperations,
        state({ resetTarget: 'footer-settings' }),
      ),
    )

    expect(result).toEqual({ conflict: 0, created: 0, skipped: 0, updated: 1 })
    expect(findGlobalAllLocales).toHaveBeenCalledOnce()
    expect(findGlobalAllLocales).toHaveBeenCalledWith({ depth: 0, slug: 'footer-settings' })
    expect(updateGlobal).toHaveBeenCalledTimes(2)
    const arabic = updateGlobal.mock.calls[0]?.[0]
    const english = updateGlobal.mock.calls[1]?.[0]
    expect(arabic.data).toMatchObject({
      address: null,
      footerBackgroundImage: null,
      footerBackgroundType: 'none',
      footerBackgroundVideo: null,
      footerPowered: null,
      hideFooterSignup: false,
    })
    expect(english.data).toMatchObject({ address: null, footerPowered: null })
    expect(Object.keys(english.data).sort()).toEqual(['address', 'footerItems', 'footerPowered'])
    expect(arabic.data.footerItems.map((row: Record<string, unknown>) => row.id)).toEqual(
      footerItems.map(({ id }) => id),
    )
    expect(
      arabic.data.footerItems.every(
        (row: { group?: unknown; link?: Record<string, unknown> }) =>
          row.group === null &&
          row.link?.newTab === false &&
          row.link?.reference === null &&
          row.link?.type === 'custom' &&
          typeof row.link?.url === 'string',
      ),
    ).toBe(true)
    expect(english.data.footerItems.map((row: Record<string, unknown>) => row.id)).toEqual(
      footerItems.map(({ id }) => id),
    )
    expect(
      english.data.footerItems.every(
        (row: Record<string, unknown>) => Object.keys(row).sort().join(',') === 'id,label',
      ),
    ).toBe(true)
  })

  it('rejects a nonempty localized global target with one-locale rows before writes', async () => {
    const footerItems = footerSettingsFixture.ar.footerItems.map((row, index) => ({
      ...row,
      id: `persisted-${index}`,
      label:
        index === 0
          ? { ar: row.label }
          : { ar: row.label, en: footerSettingsFixture.en.footerItems[index]?.label },
    }))
    const findGlobalAllLocales = vi.fn().mockResolvedValue({
      ...pristine['footer-settings'],
      footerItems,
    })
    const updateGlobal = vi.fn()

    await expect(
      globalsStage.run(
        context(
          {
            find: dependencyFind(),
            findGlobalAllLocales,
            updateGlobal,
          } as unknown as SeedOperations,
          state({ resetTarget: 'footer-settings' }),
        ),
      ),
    ).rejects.toThrow('missing localized value at "footerItems.label"')
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})
