import type { Field, GlobalConfig } from 'payload'
import {
  fieldAffectsData,
  fieldHasSubFields,
  fieldIsArrayType,
  fieldIsBlockType,
  fieldShouldBeLocalized,
} from 'payload/shared'

import { homepageBlocks } from '@/blocks'
import { NavigationMenus } from '@/collections/NavigationMenus'
import { Pages } from '@/collections/Pages'
import { AboutPage } from '@/globals/AboutPage'
import { AnalyticsSettings } from '@/globals/AnalyticsSettings'
import { ContactSettings } from '@/globals/ContactSettings'
import { DashboardMetrics } from '@/globals/DashboardMetrics'
import { FooterSettings } from '@/globals/FooterSettings'
import { NavbarSettings } from '@/globals/NavbarSettings'
import { SiteSettings } from '@/globals/SiteSettings'
import { SmartChatSettings } from '@/globals/SmartChatSettings'

interface FieldSignature {
  arrays: string[]
  blocks: string[]
  localized: string[]
  relationships: string[]
}

const expectedPage = signature({
  arrays: ['hero.links', 'populatedAuthors'],
  blocks: ['layout'],
  localized: ['content', 'hero.richText', 'title'],
  relationships: ['author', 'hero.links.link.reference', 'hero.media', 'heroImage'],
})

const expectedNavigation = signature({
  arrays: ['items', 'items.children'],
  localized: ['items.children.description', 'items.children.label', 'items.label'],
})

const expectedBlocks: Record<string, FieldSignature> = {
  admissionCTA: localized('badge', 'buttonLabel', 'description', 'heading'),
  announcements: localized('description', 'title'),
  blogGrid: localized('description', 'title'),
  campusLifeGrid: localized('description', 'title'),
  centersGrid: localized('description', 'title'),
  collegesGrid: signature({ localized: ['description', 'title'], relationships: ['selectedColleges'] }),
  contactInfo: localized('badge', 'description', 'heading'),
  cta: localized('buttonLabel', 'description', 'heading'),
  eventsGrid: localized('description', 'title'),
  facultyMembers: signature({ localized: ['description', 'title'], relationships: ['selectedFaculty'] }),
  faq: localized('description', 'title'),
  hero: localized(
    'badge',
    'description',
    'primaryCtaLabel',
    'secondaryCtaLabel',
    'tagline',
    'titlePrimary',
    'titleSecondary',
  ),
  links: signature({ arrays: ['links'], localized: ['description', 'links.description', 'links.title', 'title'] }),
  newsGrid: localized('description', 'title'),
  offersGrid: signature({ localized: ['description', 'title'], relationships: ['categoryFilter'] }),
  partners: signature({
    arrays: ['partners'],
    localized: ['description', 'partners.name', 'title'],
    relationships: ['partners.logo'],
  }),
  programsGrid: signature({ localized: ['description', 'title'], relationships: ['collegeFilter'] }),
  projectsGrid: localized('description', 'title'),
  researchGrid: signature({ localized: ['description', 'title'], relationships: ['categoryFilter'] }),
  richText: localized('content', 'heading'),
  slider: localized('title'),
  stats: signature({ arrays: ['items'], localized: ['items.label'] }),
  studyPlansGrid: localized('description', 'title'),
  teamMembers: signature({ localized: ['description', 'title'], relationships: ['selectedMembers'] }),
  video: signature({
    localized: ['overlayDescription', 'overlayTitle'],
    relationships: ['posterImage', 'videoFile'],
  }),
}

const expectedGlobals: Record<string, FieldSignature> = {
  'site-settings': signature({
    arrays: ['socialLinks'],
    localized: ['address', 'description', 'siteName', 'tagline'],
    relationships: ['favicon', 'footerLogo', 'logo'],
  }),
  'about-page': signature({
    arrays: ['teamMembers'],
    localized: [
      'goals.description',
      'goals.title',
      'header.badge',
      'header.description',
      'header.title',
      'intro.body',
      'mission.description',
      'mission.title',
      'president.messageBody',
      'president.messageClosing',
      'president.messageIntro',
      'president.name',
      'president.role',
      'president.sectionTitle',
      'teamMembers.fullName',
      'teamMembers.groupName',
      'teamMembers.jobTitle',
      'teamSection.sectionDescription',
      'teamSection.sectionTitle',
      'values.description',
      'values.title',
      'vision.description',
      'vision.title',
    ],
    relationships: [
      'intro.image',
      'president.image',
      'teamMembers.memberImage',
      'teamMembersRelationship',
    ],
  }),
  'contact-settings': signature({
    localized: [
      'contactInfo.address',
      'formLabels.emailLabel',
      'formLabels.emailPlaceholder',
      'formLabels.messageLabel',
      'formLabels.messagePlaceholder',
      'formLabels.nameLabel',
      'formLabels.namePlaceholder',
      'formLabels.subjectLabel',
      'formLabels.subjectPlaceholder',
      'formLabels.submitText',
      'page.badge',
      'page.description',
      'page.title',
    ],
  }),
  'smart-chat-settings': signature({}),
  'navbar-settings': signature({
    arrays: ['topBarItems'],
    localized: ['topBarItems.label'],
    relationships: ['callToAction.reference', 'topBarItems.link.reference'],
  }),
  'footer-settings': signature({
    arrays: ['footerItems'],
    localized: ['address', 'footerItems.label', 'footerPowered'],
    relationships: [
      'footerBackgroundImage',
      'footerBackgroundVideo',
      'footerItems.link.reference',
    ],
  }),
  'analytics-settings': signature({}),
  'dashboard-metrics': signature({}),
}

// Payload stores localized leaves in named groups on the global's root locale row.
// Only arrays and other row-producing structures receive dedicated child tables.
const expectedGlobalRootLocaleGroups: Record<string, string[]> = {
  'site-settings': [],
  'about-page': [
    'goals',
    'header',
    'intro',
    'mission',
    'president',
    'teamSection',
    'values',
    'vision',
  ],
  'contact-settings': ['contactInfo', 'formLabels', 'page'],
  'smart-chat-settings': [],
  'navbar-settings': [],
  'footer-settings': [],
  'analytics-settings': [],
  'dashboard-metrics': [],
}

export function assertSchemaContracts(): void {
  assertEqual('Pages fields', collectFields(Pages.fields), expectedPage)
  assertEqual('Navigation fields', collectFields(NavigationMenus.fields), expectedNavigation)
  if (!Pages.versions || Pages.versions === true || !Pages.versions.drafts) {
    throw new Error('Commit 4 schema contract requires Page draft versions.')
  }

  const layout = Pages.fields.find(
    (field) => fieldAffectsData(field) && field.name === 'layout' && fieldIsBlockType(field),
  )
  if (!layout || !fieldIsBlockType(layout)) {
    throw new Error('Commit 4 schema contract requires Pages.layout blocks.')
  }
  const layoutSlugs = layout.blocks.map(({ slug }) => slug)
  const registeredSlugs = homepageBlocks.map(({ slug }) => slug)
  assertStringArray('Pages.layout registrations', layoutSlugs, registeredSlugs)

  for (const block of homepageBlocks) {
    const expected = expectedBlocks[block.slug]
    if (!expected) throw new Error(`Missing Commit 4 block schema contract: ${block.slug}`)
    assertEqual(`Block ${block.slug}`, collectFields(block.fields), expected)
  }
  assertStringArray('Block schema contract inventory', Object.keys(expectedBlocks), registeredSlugs)

  const globals: GlobalConfig[] = [
    SiteSettings,
    AboutPage,
    ContactSettings,
    SmartChatSettings,
    NavbarSettings,
    FooterSettings,
    AnalyticsSettings,
    DashboardMetrics,
  ]
  for (const global of globals) {
    const expected = expectedGlobals[global.slug]
    if (!expected) throw new Error(`Missing Commit 4 global schema contract: ${global.slug}`)
    assertEqual(`Global ${global.slug}`, collectFields(global.fields), expected)
    assertStringArray(
      `Global ${global.slug} root locale groups`,
      collectLocalizedGroups(global.fields),
      expectedGlobalRootLocaleGroups[global.slug] ?? [],
    )
  }
  assertStringArray(
    'Global schema contract inventory',
    Object.keys(expectedGlobals),
    globals.map(({ slug }) => slug),
  )
}

function collectLocalizedGroups(
  fields: Field[],
  parentPath = '',
  parentLocalized = false,
  result: string[] = [],
): string[] {
  for (const field of fields) {
    const affectsData = fieldAffectsData(field)
    const path = affectsData ? joinPath(parentPath, field.name) : parentPath
    const isLocalized = fieldShouldBeLocalized({ field, parentIsLocalized: parentLocalized })
    if (!fieldHasSubFields(field)) continue
    if (field.type === 'group' && containsLocalizedLeaf(field.fields, isLocalized)) {
      result.push(path)
    }
    collectLocalizedGroups(field.fields, path, isLocalized, result)
  }
  return result.sort()
}

function containsLocalizedLeaf(fields: Field[], parentLocalized: boolean): boolean {
  return fields.some((field) => {
    const isLocalized = fieldShouldBeLocalized({ field, parentIsLocalized: parentLocalized })
    if (fieldAffectsData(field) && isLocalized) return true
    return fieldHasSubFields(field) && containsLocalizedLeaf(field.fields, isLocalized)
  })
}

export function collectFields(
  fields: Field[],
  parentPath = '',
  parentLocalized = false,
  result: FieldSignature = signature({}),
): FieldSignature {
  for (const field of fields) {
    const affectsData = fieldAffectsData(field)
    const path = affectsData ? joinPath(parentPath, field.name) : parentPath
    const isLocalized = fieldShouldBeLocalized({ field, parentIsLocalized: parentLocalized })

    if (affectsData && isLocalized) result.localized.push(path)
    if (fieldIsArrayType(field)) result.arrays.push(path)
    if (fieldIsBlockType(field)) result.blocks.push(path)
    if (affectsData && (field.type === 'relationship' || field.type === 'upload')) {
      result.relationships.push(path)
    }
    if (fieldHasSubFields(field)) {
      collectFields(field.fields, path, isLocalized, result)
    }
  }
  return normalize(result)
}

function localized(...paths: string[]): FieldSignature {
  return signature({ localized: paths })
}

function signature(value: Partial<FieldSignature>): FieldSignature {
  return normalize({
    arrays: value.arrays ?? [],
    blocks: value.blocks ?? [],
    localized: value.localized ?? [],
    relationships: value.relationships ?? [],
  })
}

function normalize(value: FieldSignature): FieldSignature {
  return {
    arrays: [...value.arrays].sort(),
    blocks: [...value.blocks].sort(),
    localized: [...value.localized].sort(),
    relationships: [...value.relationships].sort(),
  }
}

function assertEqual(label: string, actual: FieldSignature, expected: FieldSignature): void {
  for (const category of ['arrays', 'blocks', 'localized', 'relationships'] as const) {
    assertStringArray(`${label} ${category}`, actual[category], expected[category])
  }
}

function assertStringArray(label: string, actual: string[], expected: string[]): void {
  const normalizedActual = [...actual].sort()
  const normalizedExpected = [...expected].sort()
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new Error(
      `${label} differs. Expected ${normalizedExpected.join(', ') || '(none)'}; received ${normalizedActual.join(', ') || '(none)'}.`,
    )
  }
}

function joinPath(parent: string, field: string): string {
  return parent ? `${parent}.${field}` : field
}
