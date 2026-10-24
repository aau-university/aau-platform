import type { RequiredDataFromCollectionSlug } from 'payload'

import { pageFixtures } from '../../fixtures/cms'
import { graftLocalizedRowIds, type RowIdGraftSchema } from '../../lib/localized-row-ids'
import type { SeedAllLocalesDocument, SeedOperations, SeedUpdateArgs } from '../../lib/local-api'
import type { SeedCounts, SeedRunState } from '../../lib/types'
import { assertRootDocumentId, assertUniqueRootDocumentIds, markCreated } from '../helpers'

const pageRows = { layout: { discriminatorField: 'blockType' } } as const satisfies RowIdGraftSchema

const pageResetOnly = {
  author: null,
  populatedAuthors: [] as [],
  publishedAt: null,
  displayOrder: null,
  hero: { type: 'lowImpact', richText: null, links: [] as [], media: null },
  content: null,
  heroImage: null,
  meta: { title: null, description: null, image: null },
} satisfies SeedUpdateArgs<'pages'>['data']

interface PreparedPageReset {
  arabic: RequiredDataFromCollectionSlug<'pages'>
  english: RequiredDataFromCollectionSlug<'pages'>
  id: number | string
}

export async function seedPages(
  operations: SeedOperations,
  state: SeedRunState,
): Promise<SeedCounts> {
  const counts = { conflict: 0, created: 0, skipped: 0, updated: 0 }

  if (state.resetTarget === 'pages') {
    const prepared: PreparedPageReset[] = []
    for (const fixture of pageFixtures) prepared.push(await prepareReset(operations, fixture))
    for (const reset of prepared) {
      const updatedArabic = await operations.update({
        collection: 'pages',
        data: reset.arabic,
        id: reset.id,
        locale: 'ar',
      })
      const english = graftLocalizedRowIds(updatedArabic, reset.english, pageRows)
      await operations.update({
        collection: 'pages',
        data: english,
        id: reset.id,
        locale: 'en',
      })
      counts.updated += 1
    }
    return counts
  }

  for (const fixture of pageFixtures) {
    const existing = await operations.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      limit: 2,
      locale: 'ar',
      where: { slug: { equals: fixture.slug } },
    })
    assertPageIdentity(existing.docs, existing.totalDocs, fixture.slug)
    if (existing.docs.length === 1) {
      counts.skipped += 1
      continue
    }

    const created = await operations.create({ collection: 'pages', data: fixture.arabic, locale: 'ar' })
    const english = graftLocalizedRowIds(created, fixture.english, pageRows)
    await operations.update({ collection: 'pages', data: english, id: created.id, locale: 'en' })
    markCreated(state, 'pages', created.id)
    counts.created += 1
    counts.updated += 1
  }
  return counts
}

async function prepareReset(
  operations: SeedOperations,
  fixture: (typeof pageFixtures)[number],
): Promise<PreparedPageReset> {
  const result = await operations.findAllLocales({
    collection: 'pages',
    depth: 0,
    draft: true,
    limit: 2,
    where: { slug: { equals: fixture.slug } },
  })
  assertPageIdentity(result.docs, result.totalDocs, fixture.slug)
  const snapshot = result.docs[0]
  if (!snapshot) throw new Error(`Cannot safely reset page "${fixture.slug}": missing.`)

  const arabicTarget = withNestedPageResetValues({ ...fixture.arabic, ...pageResetOnly })
  const englishTarget = withNestedPageResetValues({ ...fixture.english, ...pageResetOnly })
  validatePageTopology(snapshot, arabicTarget)
  validatePageTopology(snapshot, englishTarget)
  const hasLayout = Array.isArray(snapshot.layout) && snapshot.layout.length > 0
  const arabic = hasLayout
    ? graftLocalizedRowIds(snapshot, arabicTarget, pageRows)
    : arabicTarget
  return { arabic, english: englishTarget, id: snapshot.id }
}

function withNestedPageResetValues(
  data: RequiredDataFromCollectionSlug<'pages'>,
): RequiredDataFromCollectionSlug<'pages'> {
  return {
    ...data,
    layout: data.layout.map((block) =>
      block.blockType === 'collegesGrid' ? { ...block, selectedColleges: [] } : block,
    ),
  }
}

export function validatePageTopology(
  snapshot: SeedAllLocalesDocument,
  target: RequiredDataFromCollectionSlug<'pages'>,
): void {
  if (!Array.isArray(snapshot.layout)) throw new Error('Cannot safely reset page: layout is missing.')
  if (snapshot.layout.length === 0) return
  graftLocalizedRowIds(snapshot, target, pageRows)
}

function assertPageIdentity(
  docs: readonly { id: unknown; slug?: unknown }[],
  totalDocs: number,
  slug: string,
): void {
  assertUniqueRootDocumentIds(docs, `page "${slug}"`)
  if (totalDocs !== docs.length || docs.length > 1) {
    throw new Error(`Page identity "${slug}" is missing or ambiguous.`)
  }
  for (const doc of docs) {
    assertRootDocumentId(doc.id, `page "${slug}"`)
    if (doc.slug !== slug) throw new Error(`Page identity differs for "${slug}".`)
  }
}
