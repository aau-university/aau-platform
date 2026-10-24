import { describe, expect, it } from 'vitest'

import {
  assertCommitFourConfigCoverage,
  assertFacultyCollegeNullable,
  assertRequiredSeedTables,
  globalSeedTables,
  navigationSeedTables,
  pageBlockLocaleTables,
  pageBlockTables,
  pageNestedBlockTables,
  pageVersionBlockTables,
  pageVersionRootTables,
  requiredSeedTables,
} from '../../../tests/seed/schema-guard'

describe('dedicated seed test schema guard', () => {
  it('accepts the bootstrapped scratch schema contract', () => {
    expect(() => assertRequiredSeedTables(requiredSeedTables)).not.toThrow()
    expect(() => assertCommitFourConfigCoverage()).not.toThrow()
    expect(() => assertFacultyCollegeNullable({ is_nullable: 'YES' })).not.toThrow()
  })

  it('covers root locales, row-producing child tables, relationships, and Page versions', () => {
    expect(pageBlockTables).toHaveLength(25)
    expect(pageBlockLocaleTables).toHaveLength(24)
    expect(pageNestedBlockTables).toHaveLength(6)
    expect(pageVersionRootTables).toHaveLength(5)
    expect(pageVersionBlockTables).toHaveLength(55)
    expect(navigationSeedTables).toEqual(
      expect.arrayContaining([
        'navigation_menus_items_locales',
        'navigation_menus_items_children_locales',
      ]),
    )
    expect(globalSeedTables).toEqual(
      expect.arrayContaining([
        'site_settings_locales',
        'about_page_team_members_locales',
        'navbar_settings_top_bar_items_locales',
        'footer_settings_footer_items_locales',
        'footer_settings_locales',
      ]),
    )
    expect(globalSeedTables).not.toEqual(
      expect.arrayContaining([
        'site_settings_rels',
        'about_page_header_locales',
        'about_page_intro_locales',
        'about_page_vision_locales',
        'about_page_mission_locales',
        'about_page_goals_locales',
        'about_page_values_locales',
        'about_page_president_locales',
        'about_page_team_section_locales',
        'contact_settings_page_locales',
        'contact_settings_form_labels_locales',
        'contact_settings_contact_info_locales',
      ]),
    )
    expect(globalSeedTables.filter((table) => table.endsWith('_rels'))).toEqual([
      'about_page_rels',
      'navbar_settings_rels',
      'footer_settings_rels',
    ])
    expect(requiredSeedTables).toHaveLength(148)
    expect(new Set(requiredSeedTables).size).toBe(requiredSeedTables.length)
  })

  it('fails clearly when scratch bootstrap tables are missing', () => {
    expect(() => assertRequiredSeedTables(['roles', 'users'])).toThrow(
      'missing required table(s): colleges, faculty_members, navigation_menus',
    )
  })

  it('fails clearly when faculty college is absent or not nullable', () => {
    expect(() => assertFacultyCollegeNullable(undefined)).toThrow(
      'missing faculty_members.college_id',
    )
    expect(() => assertFacultyCollegeNullable({ is_nullable: 'NO' })).toThrow(
      'faculty_members.college_id to be nullable for Payload drafts and autosave',
    )
  })
})
