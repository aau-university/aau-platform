import type { GlobalSlug } from 'payload'

import type { SeedAllLocalesDocument, SeedUpdateGlobalArgs } from './local-api'

const localizedPaths = {
  'site-settings': ['siteName', 'tagline', 'description', 'address'],
  'about-page': [
    'header.badge',
    'header.title',
    'header.description',
    'intro.body',
    'vision.title',
    'vision.description',
    'mission.title',
    'mission.description',
    'goals.title',
    'goals.description',
    'values.title',
    'values.description',
    'president.sectionTitle',
    'president.messageIntro',
    'president.messageBody',
    'president.messageClosing',
    'president.name',
    'president.role',
    'teamSection.sectionTitle',
    'teamSection.sectionDescription',
    'teamMembers.groupName',
    'teamMembers.fullName',
    'teamMembers.jobTitle',
  ],
  'contact-settings': [
    'page.badge',
    'page.title',
    'page.description',
    'formLabels.nameLabel',
    'formLabels.namePlaceholder',
    'formLabels.emailLabel',
    'formLabels.emailPlaceholder',
    'formLabels.subjectLabel',
    'formLabels.subjectPlaceholder',
    'formLabels.messageLabel',
    'formLabels.messagePlaceholder',
    'formLabels.submitText',
    'contactInfo.address',
  ],
  'navbar-settings': ['topBarItems.label'],
  'footer-settings': ['footerItems.label', 'address', 'footerPowered'],
} as const satisfies Partial<Record<GlobalSlug, readonly string[]>>

export function splitGlobalSnapshot<TSlug extends keyof typeof localizedPaths>(
  slug: TSlug,
  snapshot: SeedAllLocalesDocument,
  arabicTarget: SeedUpdateGlobalArgs<TSlug>['data'],
  englishTarget: SeedUpdateGlobalArgs<TSlug>['data'],
): { arabic: SeedAllLocalesDocument; english: SeedAllLocalesDocument } {
  const requiredPaths = new Set(
    localizedPaths[slug].filter(
      (path) =>
        pathExists(arabicTarget, path.split('.')) ||
        pathExists(englishTarget, path.split('.')),
    ),
  )
  const split = splitValue(snapshot, '', requiredPaths)
  return {
    arabic: split.arabic as SeedAllLocalesDocument,
    english: split.english as SeedAllLocalesDocument,
  }
}

function splitValue(
  value: unknown,
  path: string,
  paths: ReadonlySet<string>,
): { arabic: unknown; english: unknown } {
  if (paths.has(path)) {
    if (!isRecord(value) || !hasOwn(value, 'ar') || !hasOwn(value, 'en')) {
      throw new Error(`Cannot safely reset global: missing localized value at "${path}".`)
    }
    return { arabic: value.ar, english: value.en }
  }
  if (Array.isArray(value)) {
    const rows = value.map((row) => splitValue(row, path, paths))
    return { arabic: rows.map(({ arabic }) => arabic), english: rows.map(({ english }) => english) }
  }
  if (!isRecord(value)) return { arabic: value, english: value }

  const arabic: Record<string, unknown> = {}
  const english: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key
    const split = splitValue(child, childPath, paths)
    arabic[key] = split.arabic
    english[key] = split.english
  }
  return { arabic, english }
}

function pathExists(value: unknown, segments: readonly string[]): boolean {
  if (segments.length === 0) return true
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((row) => pathExists(row, segments))
  }
  if (!isRecord(value)) return false
  const [head, ...tail] = segments
  return hasOwn(value, head) && pathExists(value[head], tail)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}
