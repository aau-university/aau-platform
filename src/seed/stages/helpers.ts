import type { CollectionSlug, RequiredDataFromCollectionSlug } from 'payload'

import type { Config } from '@/payload-types'

import type { RowIdGraftSchema } from '../lib/localized-row-ids'
import { graftLocalizedRowIds } from '../lib/localized-row-ids'
import type {
  SeedAllLocalesDocument,
  SeedOperations,
  SeedReplaceArgs,
  SeedUpdateArgs,
} from '../lib/local-api'
import type { SeedCounts, SeedRunState } from '../lib/types'

const localizedPathsByCollection = {
  announcements: ['title', 'content'],
  'blog-posts': ['title', 'excerpt', 'content', 'tags.tag'],
  'campus-life': [
    'title',
    'content',
    'sidebarTitle',
    'highlightsTitle',
    'highlights.highlight',
    'stats.label',
    'sidebarNote',
  ],
  centers: ['title', 'description', 'services', 'programs', 'location'],
  events: ['title', 'description', 'location', 'organizer'],
  faqs: ['question', 'answer'],
  news: ['title', 'summary', 'content', 'tags.tag'],
  offers: [
    'title',
    'description',
    'details',
    'targetAudience',
    'benefits',
    'duration',
    'location',
    'requirements',
    'interestTitle',
    'interestSubtitle',
    'interestOpenTitle',
    'interestOpenSubtitle',
    'interestHighlightsTitle',
    'interestHighlights.highlight',
    'interestNotice',
  ],
  partners: ['name', 'description'],
  projects: ['title', 'description', 'details'],
  'research-publications': ['title', 'author', 'summary', 'content', 'tags.tag'],
  'team-members': ['name', 'jobTitle', 'group', 'bio'],
} as const satisfies Partial<Record<CollectionSlug, readonly string[]>>

export interface LocalizedCreateResult<TSlug extends CollectionSlug> {
  created: boolean
  doc: Config['collections'][TSlug]
  skipped: boolean
  updated: boolean
}

export async function createLocalizedIfMissing<TSlug extends CollectionSlug>({
  arabic,
  collection,
  english,
  operations,
  rowIdSchema,
  reset = false,
  resetOnly,
  slug,
  state,
}: {
  arabic: RequiredDataFromCollectionSlug<TSlug>
  collection: TSlug
  english: RequiredDataFromCollectionSlug<TSlug>
  operations: SeedOperations
  rowIdSchema?: RowIdGraftSchema
  reset?: boolean
  resetOnly?: SeedUpdateArgs<TSlug>['data']
  slug: string
  state?: SeedRunState
}): Promise<LocalizedCreateResult<TSlug>> {
  if (reset) {
    const snapshotResult = await operations.findAllLocales({
      collection,
      depth: 0,
      limit: 2,
      where: { slug: { equals: slug } },
    })
    assertUniqueRootDocumentIds(
      snapshotResult.docs,
      `${collection} fixture "${slug}" all-locales snapshot`,
    )
    if (snapshotResult.docs.length !== 1 || snapshotResult.totalDocs !== 1) {
      throw new Error(
        `Cannot safely reset ${collection} fixture "${slug}": all-locales snapshot is missing or ambiguous.`,
      )
    }
    const snapshot = snapshotResult.docs[0]
    const { arabic: currentArabic, english: currentEnglish } = splitLocalizedSnapshot(
      collection,
      snapshot,
      arabic,
      english,
    )
    if (currentArabic.id !== currentEnglish.id || snapshot.slug !== slug) {
      throw new Error(`Cannot safely reset ${collection} fixture "${slug}": identity differs.`)
    }

    const resetArabic = { ...arabic, ...resetOnly } as RequiredDataFromCollectionSlug<TSlug>
    const resetEnglish = { ...english, ...resetOnly } as RequiredDataFromCollectionSlug<TSlug>

    const localizedArabic = rowIdSchema
      ? graftLocalizedRowIds(currentArabic, resetArabic, rowIdSchema, { mode: 'reset' })
      : resetArabic
    if (rowIdSchema) {
      graftLocalizedRowIds(currentEnglish, resetEnglish, rowIdSchema, { mode: 'reset' })
    }
    const updatedArabic = await operations.update({
      collection,
      data: localizedArabic,
      id: currentArabic.id,
      locale: 'ar',
    } as SeedReplaceArgs<TSlug>)
    const localizedEnglish = rowIdSchema
      ? graftLocalizedRowIds(updatedArabic, resetEnglish, rowIdSchema, { mode: 'strict' })
      : resetEnglish
    await operations.update({
      collection,
      data: localizedEnglish,
      id: currentArabic.id,
      locale: 'en',
    } as SeedReplaceArgs<TSlug>)
    return { created: false, doc: updatedArabic, skipped: false, updated: true }
  }

  const existing = await operations.find({
    collection,
    depth: 0,
    limit: 1,
    locale: 'ar',
    where: { slug: { equals: slug } },
  })
  if (existing.docs[0]) {
    return { created: false, doc: existing.docs[0], skipped: true, updated: false }
  }

  const created = await operations.create({ collection, data: arabic, locale: 'ar' })
  const localizedEnglish = rowIdSchema
    ? graftLocalizedRowIds(created, english, rowIdSchema)
    : english
  const englishUpdate: SeedReplaceArgs<TSlug> = {
    collection,
    data: localizedEnglish,
    id: created.id,
    locale: 'en',
  }
  await operations.update(englishUpdate)
  markCreated(state, collection, created.id)
  return { created: true, doc: created, skipped: false, updated: true }
}

export function assertRootDocumentId(id: unknown, context: string): asserts id is number | string {
  const validNumber = typeof id === 'number' && Number.isSafeInteger(id)
  const validString = typeof id === 'string' && id.trim().length > 0
  if (!validNumber && !validString) {
    throw new Error(`Cannot safely reset ${context}: invalid root document ID.`)
  }
}

export function assertUniqueRootDocumentIds(
  docs: readonly { id: unknown }[],
  context: string,
): void {
  const ids = new Set<number | string>()
  for (const doc of docs) {
    assertRootDocumentId(doc.id, context)
    if (ids.has(doc.id)) {
      throw new Error(`Cannot safely reset ${context}: duplicate root document ID.`)
    }
    ids.add(doc.id)
  }
}

export function splitLocalizedSnapshot<TSlug extends CollectionSlug>(
  collection: TSlug,
  snapshot: SeedAllLocalesDocument,
  arabicTarget: RequiredDataFromCollectionSlug<TSlug>,
  englishTarget: RequiredDataFromCollectionSlug<TSlug>,
): { arabic: Config['collections'][TSlug]; english: Config['collections'][TSlug] } {
  const configuredPaths = (
    localizedPathsByCollection as Partial<Record<CollectionSlug, readonly string[]>>
  )[collection]
  if (!configuredPaths) throw new Error(`No localized reset schema for ${collection}.`)
  const requiredPaths = new Set(
    configuredPaths.filter(
      (path) =>
        pathExists(arabicTarget, path.split('.')) || pathExists(englishTarget, path.split('.')),
    ),
  )
  const split = splitSnapshotValue(snapshot, '', requiredPaths)
  return {
    arabic: split.arabic as Config['collections'][TSlug],
    english: split.english as Config['collections'][TSlug],
  }
}

function splitSnapshotValue(
  value: unknown,
  path: string,
  localizedPaths: ReadonlySet<string>,
): { arabic: unknown; english: unknown } {
  if (localizedPaths.has(path)) {
    if (!isRecord(value) || !hasOwn(value, 'ar') || !hasOwn(value, 'en')) {
      throw new Error(`Cannot safely reset: missing localized value at "${path}".`)
    }
    return { arabic: value.ar, english: value.en }
  }
  if (Array.isArray(value)) {
    const rows = value.map((row) => splitSnapshotValue(row, path, localizedPaths))
    return {
      arabic: rows.map((row) => row.arabic),
      english: rows.map((row) => row.english),
    }
  }
  if (!isRecord(value)) return { arabic: value, english: value }

  assertRequiredLocalizedChildren(value, path, localizedPaths)
  const arabic: Record<string, unknown> = {}
  const english: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key
    const split = splitSnapshotValue(child, childPath, localizedPaths)
    arabic[key] = split.arabic
    english[key] = split.english
  }
  return { arabic, english }
}

function assertRequiredLocalizedChildren(
  value: Record<string, unknown>,
  path: string,
  localizedPaths: ReadonlySet<string>,
): void {
  for (const localizedPath of localizedPaths) {
    const separator = localizedPath.lastIndexOf('.')
    const parent = separator === -1 ? '' : localizedPath.slice(0, separator)
    const field = separator === -1 ? localizedPath : localizedPath.slice(separator + 1)
    if (parent === path && !hasOwn(value, field)) {
      throw new Error(`Cannot safely reset: missing localized value at "${localizedPath}".`)
    }
  }
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

export async function requireBySlug<TSlug extends CollectionSlug>(
  operations: SeedOperations,
  collection: TSlug,
  slug: string,
): Promise<Config['collections'][TSlug]> {
  const result = await operations.find({
    collection,
    depth: 0,
    limit: 1,
    locale: 'ar',
    where: { slug: { equals: slug } },
  })
  const doc = result.docs[0]
  if (!doc) throw new Error(`Missing required ${collection} dependency: ${slug}`)
  return doc
}

export function addWriteResult(counts: SeedCounts, result: LocalizedCreateResult<CollectionSlug>) {
  if (result.created) counts.created += 1
  if (result.updated) counts.updated += 1
  if (result.skipped) counts.skipped += 1
}

export function markCreated(
  state: SeedRunState | undefined,
  collection: CollectionSlug,
  id: number | string,
): void {
  if (!state) return
  const ids = state.created.get(collection) ?? new Set<number | string>()
  ids.add(id)
  state.created.set(collection, ids)
}

export function wasCreated(
  state: SeedRunState,
  collection: CollectionSlug,
  id: number | string,
): boolean {
  return state.created.get(collection)?.has(id) === true
}

export function relationshipId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}
