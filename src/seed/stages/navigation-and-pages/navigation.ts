import type { RequiredDataFromCollectionSlug } from 'payload'

import { navigationMenuFixtures } from '../../fixtures/cms'
import { graftLocalizedRowIds, type RowIdGraftSchema } from '../../lib/localized-row-ids'
import type { SeedOperations } from '../../lib/local-api'
import type { SeedCounts, SeedRunState } from '../../lib/types'
import { assertRootDocumentId, assertUniqueRootDocumentIds, markCreated } from '../helpers'

const navigationRows = {
  items: { keyField: 'url', rows: { children: { keyField: 'url' } } },
} as const satisfies RowIdGraftSchema

interface PreparedNavigationReset {
  arabic: RequiredDataFromCollectionSlug<'navigation-menus'>
  english: RequiredDataFromCollectionSlug<'navigation-menus'>
  id: number | string
}

export async function seedNavigationMenus(
  operations: SeedOperations,
  state: SeedRunState,
): Promise<SeedCounts> {
  const counts = { conflict: 0, created: 0, skipped: 0, updated: 0 }
  validateNavigationFixtures()

  if (state.resetTarget === 'navigation-menus') {
    const prepared: PreparedNavigationReset[] = []
    for (const fixture of navigationMenuFixtures) {
      prepared.push(await prepareReset(operations, fixture))
    }
    for (const reset of prepared) {
      const updatedArabic = await operations.update({
        collection: 'navigation-menus',
        data: reset.arabic,
        id: reset.id,
        locale: 'ar',
      })
      const english = graftLocalizedRowIds(updatedArabic, reset.english, navigationRows)
      await operations.update({
        collection: 'navigation-menus',
        data: english,
        id: reset.id,
        locale: 'en',
      })
      counts.updated += 1
    }
    return counts
  }

  for (const fixture of navigationMenuFixtures) {
    const existing = await operations.find({
      collection: 'navigation-menus',
      depth: 0,
      limit: 2,
      locale: 'ar',
      where: { key: { equals: fixture.key } },
    })
    assertIdentityResult(existing.docs, existing.totalDocs, 'key', fixture.key)
    if (existing.docs.length === 1) {
      counts.skipped += 1
      continue
    }

    const created = await operations.create({
      collection: 'navigation-menus',
      data: fixture.arabic,
      locale: 'ar',
    })
    const english = graftLocalizedRowIds(created, fixture.english, navigationRows)
    await operations.update({
      collection: 'navigation-menus',
      data: english,
      id: created.id,
      locale: 'en',
    })
    markCreated(state, 'navigation-menus', created.id)
    counts.created += 1
    counts.updated += 1
  }
  return counts
}

async function prepareReset(
  operations: SeedOperations,
  fixture: (typeof navigationMenuFixtures)[number],
): Promise<PreparedNavigationReset> {
  const result = await operations.findAllLocales({
    collection: 'navigation-menus',
    depth: 0,
    limit: 2,
    where: { key: { equals: fixture.key } },
  })
  assertIdentityResult(result.docs, result.totalDocs, 'key', fixture.key)
  const snapshot = result.docs[0]
  if (!snapshot) throw new Error(`Cannot safely reset navigation menu "${fixture.key}": missing.`)

  const arabic = graftLocalizedRowIds(snapshot, fixture.arabic, navigationRows, { mode: 'reset' })
  graftLocalizedRowIds(snapshot, fixture.english, navigationRows, { mode: 'reset' })
  return { arabic, english: fixture.english, id: snapshot.id }
}

export function validateNavigationFixtures(): void {
  const keys = new Set<string>()
  for (const fixture of navigationMenuFixtures) {
    if (keys.has(fixture.key)) throw new Error(`Duplicate navigation fixture key: ${fixture.key}`)
    keys.add(fixture.key)
    validateNavigationRows(fixture.arabic.items, `${fixture.key}.arabic.items`)
    validateNavigationRows(fixture.english.items, `${fixture.key}.english.items`)
  }
}

export function validateNavigationRows(
  rows: RequiredDataFromCollectionSlug<'navigation-menus'>['items'],
  path: string,
): void {
  const urls = new Set<string>()
  for (const [index, row] of (rows ?? []).entries()) {
    if (typeof row.url !== 'string' || row.url.length === 0) {
      throw new Error(`Missing navigation URL at ${path}[${index}].`)
    }
    if (urls.has(row.url)) throw new Error(`Duplicate navigation URL at ${path}: ${row.url}`)
    urls.add(row.url)
    const childUrls = new Set<string>()
    for (const [childIndex, child] of (row.children ?? []).entries()) {
      if (typeof child.url !== 'string' || child.url.length === 0) {
        throw new Error(`Missing navigation URL at ${path}[${index}].children[${childIndex}].`)
      }
      if (childUrls.has(child.url)) {
        throw new Error(`Duplicate navigation URL at ${path}[${index}].children: ${child.url}`)
      }
      childUrls.add(child.url)
    }
  }
}

function assertIdentityResult(
  docs: readonly { id: unknown; key?: unknown }[],
  totalDocs: number,
  field: 'key',
  identity: string,
): void {
  assertUniqueRootDocumentIds(docs, `navigation menu "${identity}"`)
  if (totalDocs !== docs.length || docs.length > 1) {
    throw new Error(`Navigation identity "${identity}" is missing or ambiguous.`)
  }
  for (const doc of docs) {
    assertRootDocumentId(doc.id, `navigation menu "${identity}"`)
    if (doc[field] !== identity) throw new Error(`Navigation identity differs for "${identity}".`)
  }
}
