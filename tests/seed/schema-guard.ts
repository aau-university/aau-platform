import { assertSchemaContracts } from './schema-contracts'

export const academicSeedTables = ['roles', 'users', 'colleges', 'faculty_members'] as const

export const navigationSeedTables = [
  'navigation_menus',
  'navigation_menus_items',
  'navigation_menus_items_locales',
  'navigation_menus_items_children',
  'navigation_menus_items_children_locales',
] as const

export const pageRootTables = [
  'pages',
  'pages_populated_authors',
  'pages_hero_links',
  'pages_rels',
  'pages_locales',
] as const

const pageBlockTableBySlug = {
  hero: 'pages_blocks_hero',
  stats: 'pages_blocks_stats',
  collegesGrid: 'pages_blocks_colleges_grid',
  newsGrid: 'pages_blocks_news_grid',
  eventsGrid: 'pages_blocks_events_grid',
  blogGrid: 'pages_blocks_blog_grid',
  faq: 'pages_blocks_faq',
  teamMembers: 'pages_blocks_team_members',
  partners: 'pages_blocks_partners',
  admissionCTA: 'pages_blocks_admission_c_t_a',
  contactInfo: 'pages_blocks_contact_info',
  richText: 'pages_blocks_rich_text',
  cta: 'pages_blocks_cta',
  announcements: 'pages_blocks_announcements',
  campusLifeGrid: 'pages_blocks_campus_life_grid',
  centersGrid: 'pages_blocks_centers_grid',
  offersGrid: 'pages_blocks_offers_grid',
  projectsGrid: 'pages_blocks_projects_grid',
  researchGrid: 'pages_blocks_research_grid',
  studyPlansGrid: 'pages_blocks_study_plans_grid',
  video: 'pages_blocks_video',
  facultyMembers: 'pages_blocks_faculty_members',
  programsGrid: 'pages_blocks_programs_grid',
  slider: 'pages_blocks_slider',
  links: 'pages_blocks_links',
} as const

export const pageBlockTables = Object.values(pageBlockTableBySlug)

const pageBlocksWithoutRootLocales = new Set(['stats'])
export const pageBlockLocaleTables = Object.entries(pageBlockTableBySlug)
  .filter(([slug]) => !pageBlocksWithoutRootLocales.has(slug))
  .map(([, table]) => `${table}_locales`)

export const pageNestedBlockTables = [
  'pages_blocks_stats_items',
  'pages_blocks_stats_items_locales',
  'pages_blocks_partners_partners',
  'pages_blocks_partners_partners_locales',
  'pages_blocks_links_links',
  'pages_blocks_links_links_locales',
] as const

export const pageVersionRootTables = [
  '_pages_v',
  '_pages_v_version_populated_authors',
  '_pages_v_version_hero_links',
  '_pages_v_rels',
  '_pages_v_locales',
] as const

export const pageVersionBlockTables = [
  ...pageBlockTables,
  ...pageBlockLocaleTables,
  ...pageNestedBlockTables,
].map((table) => table.replace(/^pages_/, '_pages_v_'))

export const globalSeedTables = [
  'site_settings',
  'site_settings_social_links',
  'site_settings_locales',
  'about_page',
  'about_page_team_members',
  'about_page_team_members_locales',
  'about_page_rels',
  'contact_settings',
  'smart_chat_settings',
  'navbar_settings',
  'navbar_settings_top_bar_items',
  'navbar_settings_top_bar_items_locales',
  'navbar_settings_rels',
  'footer_settings',
  'footer_settings_footer_items',
  'footer_settings_footer_items_locales',
  'footer_settings_locales',
  'footer_settings_rels',
  'analytics_settings',
] as const

export const requiredSeedTables = [
  ...academicSeedTables,
  ...navigationSeedTables,
  ...pageRootTables,
  ...pageBlockTables,
  ...pageBlockLocaleTables,
  ...pageNestedBlockTables,
  ...pageVersionRootTables,
  ...pageVersionBlockTables,
  ...globalSeedTables,
]

export function assertCommitFourConfigCoverage(): void {
  assertSchemaContracts()
  if (requiredSeedTables.length !== 148 || new Set(requiredSeedTables).size !== 148) {
    throw new Error('Commit 4 schema inventory must contain exactly 148 unique table names.')
  }
}

export function assertRequiredSeedTables(tableNames: Iterable<string>): void {
  assertCommitFourConfigCoverage()
  const available = new Set(tableNames)
  const missing = requiredSeedTables.filter((table) => !available.has(table))
  if (missing.length > 0) {
    throw new Error(
      `Scratch seed schema is missing required table(s): ${missing.join(', ')}. Run the approved scratch schema bootstrap before pnpm test:seed.`,
    )
  }
}

export function assertFacultyCollegeNullable(
  column: { is_nullable: string } | undefined,
): void {
  if (!column) {
    throw new Error(
      'Scratch seed schema is missing faculty_members.college_id. Run the approved scratch schema bootstrap before pnpm test:seed.',
    )
  }
  if (column.is_nullable !== 'YES') {
    throw new Error(
      'Scratch seed schema requires faculty_members.college_id to be nullable for Payload drafts and autosave.',
    )
  }
}
