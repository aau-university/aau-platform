import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import { runSeed } from '@/seed/run-seed'
import { departmentsStage } from '@/seed/stages/departments'
import { assertAboutReset, corruptAboutForReset } from './assertions/about-reset'
import {
  assertContentLocalizedTopology,
  assertDraftStatusAndDates,
  assertEditorSentinel,
  assertLocalizedTopology,
  assertPersistedParity,
} from './assertions/academic-content'
import {
  assertCommitFourCms,
  assertDashboardUnchanged,
  assertFreshGlobalShapes,
  assertInitializedCommitFourGlobals,
  readDashboardSnapshot,
  readGlobalTimestampSnapshot,
} from './assertions/commit-four'
import {
  assertFooterReset,
  assertHomeReset,
  corruptFooterForReset,
  corruptHomeForReset,
  removeHomeBlockForTopologyFailure,
} from './assertions/commit-four-resets'
import { resetOptionalContent, resetSlugKeyedBlog } from './assertions/content-resets'
import { assertNavbarReset, corruptNavbarForReset } from './assertions/navbar-reset'
import {
  assertNavigationMenusReset,
  corruptNavigationMenusForReset,
} from './assertions/navigation-reset'
import {
  assertInventory,
  fixtureDocument,
  hiddenAdminSnapshot,
  inventory,
  readArabicInventory,
  readAssertionSnapshot,
  readCollectionSnapshot,
  readVersionCounts,
  setEditorSentinel,
  stageElapsedDiagnostics,
  timestampSnapshot,
} from './assertions/seed-state'

describe.sequential('canonical academic seed on scratch PostgreSQL', () => {
  let payload: Payload
  let expectedAuth: ReturnType<typeof hiddenAdminSnapshot> | undefined
  let expectedTimestamps: ReturnType<typeof timestampSnapshot> | undefined
  let expectedVersions: Awaited<ReturnType<typeof readVersionCounts>> | undefined
  let expectedDashboard: Record<string, unknown> | undefined
  let initialGlobalsFlag: string | undefined

  beforeAll(async () => {
    if (!process.env.INITIAL_ADMIN_EMAIL || !process.env.INITIAL_ADMIN_PASSWORD) {
      throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required for test:seed.')
    }
    payload = await getPayload({ config })
    initialGlobalsFlag = process.env.SEED_INITIALIZE_GLOBALS
    delete process.env.SEED_INITIALIZE_GLOBALS
    expectedDashboard = await readDashboardSnapshot(payload)
    if (process.env.SEED_TEST_REUSE_EXISTING !== 'true') {
      for (const [collection] of inventory) {
        const result = await payload.count({ collection, overrideAccess: true })
        expect(result.totalDocs, `${collection} must be empty before test:seed`).toBe(0)
      }
    }
  })

  afterAll(async () => {
    if (initialGlobalsFlag === undefined) delete process.env.SEED_INITIALIZE_GLOBALS
    else process.env.SEED_INITIALIZE_GLOBALS = initialGlobalsFlag
    await payload?.destroy()
  })

  it('fails fast when a required dependency is absent', async () => {
    await expect(
      runSeed(payload, {
        onStageResult: stageElapsedDiagnostics('dependency-check'),
        stages: [departmentsStage],
      }),
    ).rejects.toThrow('Missing required colleges dependency')
  })

  it('seeds canonical content and snapshots persisted state', async () => {
    await assertFreshGlobalShapes(payload)
    const first = await runSeed(payload, {
      onStageResult: stageElapsedDiagnostics('first-run'),
    })
    expect(first.stages.map(({ name }) => name)).toEqual([
      'roles',
      'bootstrap-admin',
      'categories-and-colleges',
      'optional-users',
      'departments',
      'programs',
      'study-plans-and-faculty',
      'department-heads',
      'team-members',
      'editorial-content',
      'services-content',
      'marketing-content',
      'keyless-content',
      'navigation-and-pages',
      'globals',
    ])
    expect(first.stages).toMatchObject([
      { created: 6, updated: 6 },
      { created: 1, updated: 0 },
      { created: 24, updated: 24 },
      { created: 0, updated: 0 },
      { created: 5, updated: 5 },
      { created: 5, updated: 5 },
      { created: 11, updated: 11 },
      { created: 0, updated: 5 },
      { created: 7, updated: 7 },
      { created: 44, updated: 44 },
      { created: 41, updated: 41 },
      { created: 25, updated: 25 },
      { created: 19, updated: 19 },
      { created: 2, updated: 2 },
      { created: 0, skipped: 7, updated: 0 },
    ])

    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
    await assertCommitFourCms(payload)
    await setEditorSentinel(payload)

    const snapshot = await readAssertionSnapshot(payload)
    expectedAuth = hiddenAdminSnapshot(snapshot.ar.users)
    expectedTimestamps = timestampSnapshot(snapshot.ar)
    expectedVersions = await readVersionCounts(payload)
    assertInventory(snapshot.ar)
    assertEditorSentinel(snapshot.ar['team-members'])
    expect(fixtureDocument(snapshot.ar.pages, 'home').title).toBe('EDITOR PAGE SENTINEL')
    assertLocalizedTopology(snapshot)
    assertContentLocalizedTopology(snapshot)
    assertDraftStatusAndDates(snapshot)
    assertPersistedParity(snapshot)
  })

  it('initializes exactly seven pristine globals only with the strict opt-in', async () => {
    process.env.SEED_INITIALIZE_GLOBALS = 'true'
    const initialized = await runSeed(payload, {
      onStageResult: stageElapsedDiagnostics('global-initialization'),
    })
    expect(initialized.stages.find(({ name }) => name === 'globals')).toMatchObject({
      conflict: 0,
      skipped: 0,
      updated: 7,
    })
    await assertInitializedCommitFourGlobals(payload)
    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
    await payload.updateGlobal({
      slug: 'site-settings',
      context: { disableRevalidate: true },
      data: { tagline: 'EDITOR GLOBAL SENTINEL' },
      fallbackLocale: false,
      locale: 'ar',
      overrideAccess: true,
    })
  })

  it('performs zero writes and preserves the first-run snapshot', async () => {
    if (!expectedAuth || !expectedTimestamps || !expectedVersions) {
      throw new Error('Missing first-run snapshots; the stateful seed test must run first.')
    }
    const second = await runSeed(payload, {
      onStageResult: stageElapsedDiagnostics('second-run'),
    })
    expect(second.created).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.skipped).toBe(176)
    expect(second.conflict).toBe(10)
    expect(second.stages.find(({ name }) => name === 'globals')).toMatchObject({
      conflict: 7,
      updated: 0,
    })

    const snapshot = await readAssertionSnapshot(payload)
    expect(hiddenAdminSnapshot(snapshot.ar.users)).toEqual(expectedAuth)
    expect(timestampSnapshot(snapshot.ar)).toEqual(expectedTimestamps)
    expect(await readVersionCounts(payload)).toEqual(expectedVersions)
    assertInventory(snapshot.ar)
    assertEditorSentinel(snapshot.ar['team-members'])
    expect(fixtureDocument(snapshot.ar.pages, 'home').title).toBe('EDITOR PAGE SENTINEL')
    assertLocalizedTopology(snapshot)
    assertContentLocalizedTopology(snapshot)
    assertDraftStatusAndDates(snapshot)
    assertPersistedParity(snapshot)
    const siteSettings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      fallbackLocale: false,
      locale: 'ar',
      overrideAccess: true,
    })
    expect(siteSettings.tagline).toBe('EDITOR GLOBAL SENTINEL')
    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
  })

  it('preserves a real draft during an idempotent rerun and keeps it private', async () => {
    const slug = 'seed-idempotency-draft-contract'
    const draft = await payload.create({
      collection: 'colleges',
      context: { disableRevalidate: true },
      data: {
        _status: 'draft',
        name: 'Seed idempotency draft contract',
        slug,
      },
      draft: true,
      locale: 'en',
      overrideAccess: true,
    })

    try {
      const versionsBefore = await readVersionCounts(payload)
      const rerun = await runSeed(payload, {
        onStageResult: stageElapsedDiagnostics('draft-preservation-run'),
      })

      expect(rerun.created).toBe(0)
      expect(rerun.updated).toBe(0)
      expect(await readVersionCounts(payload)).toEqual(versionsBefore)

      const [draftResult, publicResult] = await Promise.all([
        payload.find({
          collection: 'colleges',
          depth: 0,
          draft: true,
          limit: 1,
          locale: 'en',
          overrideAccess: true,
          where: { slug: { equals: slug } },
        }),
        payload.find({
          collection: 'colleges',
          depth: 0,
          draft: false,
          limit: 1,
          locale: 'en',
          overrideAccess: false,
          where: { slug: { equals: slug } },
        }),
      ])

      expect(draftResult.docs).toHaveLength(1)
      expect(draftResult.docs[0]).toMatchObject({ id: draft.id, _status: 'draft', slug })
      expect(publicResult.docs).toHaveLength(0)
    } finally {
      await payload.delete({
        collection: 'colleges',
        context: { disableRevalidate: true },
        id: draft.id,
        overrideAccess: true,
      })
    }
  })

  it('isolates page and Footer resets and restores omitted values', async () => {
    const before = await readArabicInventory(payload)
    const unrelatedBefore = timestampSnapshot(before, { except: 'pages' })
    const pageCorruption = await corruptHomeForReset(payload)
    const pageReset = await runSeed(payload, { resetTarget: 'pages' })
    expect(pageReset.stages.map(({ name }) => name)).toEqual(['navigation-and-pages'])
    expect(pageReset.updated).toBe(1)
    await assertHomeReset(payload, pageCorruption)
    expect(timestampSnapshot(await readArabicInventory(payload), { except: 'pages' })).toEqual(
      unrelatedBefore,
    )

    const unrelatedGlobals = await readGlobalTimestampSnapshot(payload, 'footer-settings')
    const footerCorruption = await corruptFooterForReset(payload)
    const footerReset = await runSeed(payload, { resetTarget: 'footer-settings' })
    expect(footerReset.stages.map(({ name }) => name)).toEqual(['globals'])
    expect(footerReset.updated).toBe(1)
    await assertFooterReset(payload, footerCorruption)
    expect(await readGlobalTimestampSnapshot(payload, 'footer-settings')).toEqual(unrelatedGlobals)
    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
  })

  it('resets About in both locales without changing unrelated globals', async () => {
    const unrelatedGlobals = await readGlobalTimestampSnapshot(payload, 'about-page')
    const aboutCorruption = await corruptAboutForReset(payload)
    const aboutReset = await runSeed(payload, { resetTarget: 'about-page' })
    expect(aboutReset.stages.map(({ name }) => name)).toEqual(['globals'])
    expect(aboutReset.updated).toBe(1)
    await assertAboutReset(payload, aboutCorruption)
    expect(await readGlobalTimestampSnapshot(payload, 'about-page')).toEqual(unrelatedGlobals)
    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
  })

  it('resets Navbar shared fields without changing unrelated globals', async () => {
    const unrelatedGlobals = await readGlobalTimestampSnapshot(payload, 'navbar-settings')
    const navbarCorruption = await corruptNavbarForReset(payload)
    const navbarReset = await runSeed(payload, { resetTarget: 'navbar-settings' })
    expect(navbarReset.stages.map(({ name }) => name)).toEqual(['globals'])
    expect(navbarReset.updated).toBe(1)
    await assertNavbarReset(payload, navbarCorruption)
    expect(await readGlobalTimestampSnapshot(payload, 'navbar-settings')).toEqual(unrelatedGlobals)
    if (!expectedDashboard) throw new Error('Missing pristine Dashboard snapshot.')
    await assertDashboardUnchanged(payload, expectedDashboard)
  })

  it('resets bilingual navigation without changing unrelated state', async () => {
    const [inventoryBefore, globalsBefore, dashboardBefore] = await Promise.all([
      readArabicInventory(payload),
      readGlobalTimestampSnapshot(payload),
      readDashboardSnapshot(payload),
    ])
    const unrelatedCollections = timestampSnapshot(inventoryBefore, {
      except: 'navigation-menus',
    })
    const corruption = await corruptNavigationMenusForReset(payload)
    const reset = await runSeed(payload, { resetTarget: 'navigation-menus' })
    expect(reset.stages.map(({ name }) => name)).toEqual(['navigation-and-pages'])
    expect(reset.updated).toBe(1)
    await assertNavigationMenusReset(payload, corruption)
    expect(timestampSnapshot(await readArabicInventory(payload), { except: 'navigation-menus' })).toEqual(unrelatedCollections)
    expect(await readGlobalTimestampSnapshot(payload)).toEqual(globalsBefore)
    await assertDashboardUnchanged(payload, dashboardBefore)
  })

  it('resets one slug-keyed target while preserving actual row IDs and unrelated content', async () => {
    await resetSlugKeyedBlog(payload)
  })

  it('persists canonical null and empty-array resets through real Payload hooks', async () => {
    await resetOptionalContent(payload)
  })

  it('aborts a real non-empty Home topology mismatch before reset writes', async () => {
    await removeHomeBlockForTopologyFailure(payload)
    const before = await readCollectionSnapshot(payload, 'pages', 'ar')
    const homeBefore = fixtureDocument(before, 'home')
    await expect(runSeed(payload, { resetTarget: 'pages' })).rejects.toThrow(
      'unkeyed row counts differ',
    )
    const after = await readCollectionSnapshot(payload, 'pages', 'ar')
    const homeAfter = fixtureDocument(after, 'home')
    expect(homeAfter.updatedAt).toBe(homeBefore.updatedAt)
    expect(homeAfter.layout.map(({ id }) => id)).toEqual(homeBefore.layout.map(({ id }) => id))
  })
})
