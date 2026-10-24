import { performance } from 'node:perf_hooks'

import { expect } from 'vitest'
import type { Payload } from 'payload'

import type { SeedStageResult } from '@/seed/lib/types'

export const inventory = [
  ['academic-departments', 5],
  ['academic-programs', 5],
  ['categories', 20],
  ['colleges', 4],
  ['faculty-members', 6],
  ['roles', 6],
  ['study-plans', 5],
  ['users', 1],
  ['team-members', 7],
  ['news', 9],
  ['events', 9],
  ['blog-posts', 5],
  ['faqs', 13],
  ['announcements', 8],
  ['centers', 10],
  ['projects', 10],
  ['research-publications', 10],
  ['campus-life', 11],
  ['offers', 9],
  ['partners', 16],
  ['sliders', 5],
  ['student-affairs-documents', 8],
  ['admission-requirements', 6],
  ['navigation-menus', 1],
  ['pages', 1],
] as const

export const draftContracts = [
  ['academic-departments', undefined],
  ['academic-programs', undefined],
  ['colleges', undefined],
  ['faculty-members', undefined],
  ['news', 'publishedAt'],
  ['events', 'eventDate'],
  ['blog-posts', 'publishedAt'],
  ['faqs', undefined],
  ['announcements', 'publishDate'],
  ['centers', 'publishedAt'],
  ['projects', 'publishedAt'],
  ['research-publications', 'publishDate'],
  ['campus-life', 'publishedAt'],
  ['offers', 'publishedAt'],
  ['student-affairs-documents', undefined],
  ['admission-requirements', undefined],
  ['pages', 'publishedAt'],
  ['study-plans', undefined],
] as const

const draftCollectionSlugs = new Set<string>(draftContracts.map(([collection]) => collection))
export type InventoryCollection = (typeof inventory)[number][0]
export type SeedLocale = 'ar' | 'en'

export async function readCollectionSnapshot<TCollection extends InventoryCollection>(
  payload: Payload,
  collection: TCollection,
  locale: SeedLocale,
) {
  const result = await payload.find({
    collection,
    depth: 0,
    draft: draftCollectionSlugs.has(collection),
    fallbackLocale: false,
    limit: 0,
    locale,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: collection === 'users',
    sort: 'id',
  })
  return {
    ...result,
    byId: new Map(result.docs.map((doc) => [doc.id, doc])),
    bySlug: indexBySlug(result.docs),
  }
}

export async function readArabicInventory(payload: Payload) {
  const entries = await Promise.all(
    inventory.map(async ([collection]) => [
      collection,
      await readCollectionSnapshot(payload, collection, 'ar'),
    ] as const),
  )
  return Object.fromEntries(entries) as {
    [TCollection in InventoryCollection]: Awaited<ReturnType<typeof readCollectionSnapshot<TCollection>>>
  }
}

export async function readAssertionSnapshot(payload: Payload) {
  const ar = await readArabicInventory(payload)
  const [
    colleges,
    departments,
    programs,
    faculty,
    studyPlans,
    news,
    events,
    blogs,
    faqs,
    announcements,
    centers,
    projects,
    research,
    campusLife,
    offers,
    studentDocuments,
    admissionRequirements,
    navigation,
    pages,
  ] = await Promise.all([
    readCollectionSnapshot(payload, 'colleges', 'en'),
    readCollectionSnapshot(payload, 'academic-departments', 'en'),
    readCollectionSnapshot(payload, 'academic-programs', 'en'),
    readCollectionSnapshot(payload, 'faculty-members', 'en'),
    readCollectionSnapshot(payload, 'study-plans', 'en'),
    readCollectionSnapshot(payload, 'news', 'en'),
    readCollectionSnapshot(payload, 'events', 'en'),
    readCollectionSnapshot(payload, 'blog-posts', 'en'),
    readCollectionSnapshot(payload, 'faqs', 'en'),
    readCollectionSnapshot(payload, 'announcements', 'en'),
    readCollectionSnapshot(payload, 'centers', 'en'),
    readCollectionSnapshot(payload, 'projects', 'en'),
    readCollectionSnapshot(payload, 'research-publications', 'en'),
    readCollectionSnapshot(payload, 'campus-life', 'en'),
    readCollectionSnapshot(payload, 'offers', 'en'),
    readCollectionSnapshot(payload, 'student-affairs-documents', 'en'),
    readCollectionSnapshot(payload, 'admission-requirements', 'en'),
    readCollectionSnapshot(payload, 'navigation-menus', 'en'),
    readCollectionSnapshot(payload, 'pages', 'en'),
  ])
  return {
    ar,
    en: {
      colleges,
      'academic-departments': departments,
      'academic-programs': programs,
      'faculty-members': faculty,
      'study-plans': studyPlans,
      news,
      events,
      'blog-posts': blogs,
      faqs,
      announcements,
      centers,
      projects,
      'research-publications': research,
      'campus-life': campusLife,
      offers,
      'student-affairs-documents': studentDocuments,
      'admission-requirements': admissionRequirements,
      'navigation-menus': navigation,
      pages,
    },
  }
}

export type ArabicInventorySnapshot = Awaited<ReturnType<typeof readArabicInventory>>
export type AssertionSnapshot = Awaited<ReturnType<typeof readAssertionSnapshot>>

export function fixtureDocument<TDocument>(
  snapshot: { bySlug: ReadonlyMap<string, TDocument> },
  slug: string,
): TDocument {
  const doc = snapshot.bySlug.get(slug)
  if (!doc) throw new Error(`Missing fixture: ${slug}`)
  return doc
}

export function hiddenAdminSnapshot(users: ArabicInventorySnapshot['users']) {
  const user = users.docs.find(({ email }) => email === process.env.INITIAL_ADMIN_EMAIL)
  if (!user) throw new Error('Seeded bootstrap admin was not found.')
  return {
    hash: user.hash,
    lockUntil: user.lockUntil,
    loginAttempts: user.loginAttempts,
    roleCanAccessPayloadAdmin: user.roleCanAccessPayloadAdmin,
    roleIsActive: user.roleIsActive,
    roleLevel: user.roleLevel,
    rolePermissions: user.rolePermissions,
    roleSlug: user.roleSlug,
    salt: user.salt,
    sessions: user.sessions,
  }
}

export function timestampSnapshot(
  snapshot: ArabicInventorySnapshot,
  options: { except?: InventoryCollection } = {},
) {
  return Object.fromEntries(
    inventory
      .filter(([collection]) => collection !== options.except)
      .map(([collection]) => [
        collection,
        snapshot[collection].docs.map(({ id, updatedAt }) => [id, updatedAt]),
      ]),
  )
}

export function assertInventory(snapshot: ArabicInventorySnapshot): void {
  for (const [collection, expected] of inventory) {
    expect(snapshot[collection].totalDocs, collection).toBe(expected)
  }
}

export async function readVersionCounts(payload: Payload) {
  const entries = await Promise.all(
    draftContracts.map(async ([collection]) => {
      const result = await payload.findVersions({
        collection,
        limit: 0,
        overrideAccess: true,
        pagination: false,
      })
      return [collection, result.totalDocs] as const
    }),
  )
  return Object.fromEntries(entries)
}

export async function setEditorSentinel(payload: Payload): Promise<void> {
  const [members, pages] = await Promise.all([
    readCollectionSnapshot(payload, 'team-members', 'ar'),
    readCollectionSnapshot(payload, 'pages', 'ar'),
  ])
  const member = fixtureDocument(members, 'president-hamdan')
  const home = fixtureDocument(pages, 'home')
  await payload.update({
    collection: 'team-members',
    context: { disableRevalidate: true },
    data: { name: 'EDITOR SENTINEL' },
    fallbackLocale: false,
    id: member.id,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'pages',
    context: { disableRevalidate: true },
    data: { title: 'EDITOR PAGE SENTINEL' },
    fallbackLocale: false,
    id: home.id,
    locale: 'ar',
    overrideAccess: true,
  })
}

export function stageElapsedDiagnostics(run: string): (result: SeedStageResult) => void {
  let previousStageAt = performance.now()
  return ({ name, status }) => {
    const completedAt = performance.now()
    const elapsedMs = Math.round(completedAt - previousStageAt)
    previousStageAt = completedAt
    process.stdout.write(
      `[test:seed] run=${run} stage=${name} status=${status} elapsedMs=${elapsedMs}\n`,
    )
  }
}

function indexBySlug<TDocument extends { id: number | string }>(docs: TDocument[]) {
  return new Map(
    docs.flatMap((doc) =>
      'slug' in doc && typeof doc.slug === 'string' ? [[doc.slug, doc] as const] : [],
    ),
  )
}
