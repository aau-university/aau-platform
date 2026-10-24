/**
 * The canonical version backfill, against a real PostgreSQL and the real
 * Payload configuration.
 *
 * The unit tests cover the refusals; this covers the thing that actually
 * matters and that no source assertion can reach: that a document which
 * predates versioning gets ONE canonical version carrying its real Arabic and
 * English content, its relationships, its arrays and its publication state —
 * and that running the backfill twice does not produce a second one.
 *
 * The starting state is produced by deleting the version rows of freshly
 * created documents, which is exactly the shape the migrated Neon content has:
 * populated main tables, empty version tables.
 */
import { randomUUID } from 'node:crypto'

import { Client } from 'pg'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runVersionBackfill } from '@/migration/version-backfill/backfill'

const FIXTURE_CONTEXT = { disableRevalidate: true } as const

type TrackedCollection = 'colleges' | 'academic-programs' | 'academic-departments' | 'study-plans'

let payload: Payload
const cleanup: Array<{ collection: TrackedCollection; id: number | string }> = []

const suffix = randomUUID().slice(0, 8)
let collegeId: number | string
let departmentId: number | string
let programId: number | string
let studyPlanId: number | string

/** Strip every version row for a document, leaving the main row untouched. */
async function clearVersions(collection: TrackedCollection, id: number | string): Promise<void> {
  await payload.db.deleteVersions({
    collection,
    req: undefined,
    where: { parent: { equals: id } },
  })
}

async function countVersions(collection: TrackedCollection, id: number | string): Promise<number> {
  const { totalDocs } = await payload.db.countVersions({
    collection,
    where: { parent: { equals: id } },
  })
  return totalDocs
}

async function latestVersion(
  collection: TrackedCollection,
  id: number | string,
): Promise<Record<string, unknown>> {
  const { docs } = await payload.db.findVersions({
    collection,
    limit: 10,
    locale: 'all',
    pagination: false,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  })
  expect(docs, `${collection}#${id} should have exactly one latest version`).toHaveLength(1)
  return docs[0] as Record<string, unknown>
}

describe('canonical initial-version backfill', () => {
  beforeAll(async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    payload = await getPayload({ config: await config })

    const college = await payload.create({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: {
        name: `كلية الاختبار ${suffix}`,
        slug: `backfill-college-${suffix}`,
        icon: 'graduation-cap',
        _status: 'published',
      },
      locale: 'ar',
      overrideAccess: true,
    })
    collegeId = college.id
    cleanup.push({ collection: 'colleges', id: collegeId })

    // The English value is written as a second, locale-scoped update so the
    // document genuinely holds two locale rows — the thing a raw-SQL backfill
    // would be most likely to lose.
    await payload.update({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: { name: `Backfill Test College ${suffix}` },
      id: collegeId,
      locale: 'en',
      overrideAccess: true,
    })

    const department = await payload.create({
      collection: 'academic-departments',
      context: FIXTURE_CONTEXT,
      data: {
        name: `قسم الاختبار ${suffix}`,
        slug: `backfill-department-${suffix}`,
        college: collegeId,
        _status: 'published',
      },
      locale: 'ar',
      overrideAccess: true,
    })
    departmentId = department.id
    cleanup.push({ collection: 'academic-departments', id: departmentId })

    const program = await payload.create({
      collection: 'academic-programs',
      context: FIXTURE_CONTEXT,
      data: {
        name: `برنامج الاختبار ${suffix}`,
        slug: `backfill-program-${suffix}`,
        college: collegeId,
        department: departmentId,
        // Deliberately a DRAFT: the canonical version must carry the
        // document's own publication state, not a uniform 'published'.
        _status: 'draft',
      },
      draft: true,
      locale: 'ar',
      overrideAccess: true,
    })
    programId = program.id
    cleanup.push({ collection: 'academic-programs', id: programId })

    const studyPlan = await payload.create({
      collection: 'study-plans',
      context: FIXTURE_CONTEXT,
      data: {
        name: `خطة دراسية ${suffix}`,
        slug: `backfill-study-plan-${suffix}`,
        // `college` is derived from the programme by a beforeChange hook and is
        // deliberately not set here.
        academicProgram: programId,
        courses: [
          { code: 'AAU-101', name: `مقدمة ${suffix}`, credits: 3, year: 1, semester: '1' },
          { code: 'AAU-102', name: `متقدم ${suffix}`, credits: 4, year: 1, semester: '2' },
        ],
        _status: 'published',
      },
      locale: 'ar',
      overrideAccess: true,
    })
    studyPlanId = studyPlan.id
    cleanup.push({ collection: 'study-plans', id: studyPlanId })

    // One global given real content, so the global half of the backfill has
    // something to preserve. The other four are left untouched and therefore
    // have no row at all — which is the case that must NOT produce a version.
    await payload.updateGlobal({
      context: FIXTURE_CONTEXT,
      data: {
        siteName: `جامعة الاختبار ${suffix}`,
        contactEmail: `backfill-${suffix}@example.test`,
      },
      locale: 'ar',
      overrideAccess: true,
      slug: 'site-settings',
    })
    await payload.updateGlobal({
      context: FIXTURE_CONTEXT,
      data: { siteName: `Backfill Test University ${suffix}` },
      locale: 'en',
      overrideAccess: true,
      slug: 'site-settings',
    })
    await payload.db.deleteVersions({
      globalSlug: 'site-settings',
      req: undefined,
      where: {},
    })

    // Reproduce the migrated state: main rows present, version tables empty.
    await clearVersions('colleges', collegeId)
    await clearVersions('academic-departments', departmentId)
    await clearVersions('academic-programs', programId)
    await clearVersions('study-plans', studyPlanId)
  }, 120_000)

  afterAll(async () => {
    for (const fixture of cleanup.reverse()) {
      await payload
        ?.delete({
          collection: fixture.collection,
          context: FIXTURE_CONTEXT,
          id: fixture.id,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }
    await payload?.destroy()
  }, 60_000)

  it('starts from the migrated condition: documents with no versions at all', async () => {
    expect(await countVersions('colleges', collegeId)).toBe(0)
    expect(await countVersions('academic-departments', departmentId)).toBe(0)
    expect(await countVersions('academic-programs', programId)).toBe(0)
    expect(await countVersions('study-plans', studyPlanId)).toBe(0)
  })

  it('gives every document exactly one canonical latest version', async () => {
    const result = await runVersionBackfill(payload)

    expect(result.created).toBeGreaterThanOrEqual(4)
    expect(result.entities.map((entity) => entity.slug)).toEqual(
      expect.arrayContaining([
        'colleges',
        'academic-departments',
        'academic-programs',
        'faculty-members',
        'study-plans',
        'site-settings',
        'about-page',
        'contact-settings',
        'navbar-settings',
        'footer-settings',
      ]),
    )

    expect(await countVersions('colleges', collegeId)).toBe(1)
    expect(await countVersions('academic-departments', departmentId)).toBe(1)
    expect(await countVersions('academic-programs', programId)).toBe(1)
    expect(await countVersions('study-plans', studyPlanId)).toBe(1)
  }, 120_000)

  it('gives a global with content one initial version, carrying both locales', async () => {
    const { docs } = await payload.db.findGlobalVersions({
      global: 'site-settings',
      limit: 10,
      locale: 'all',
      pagination: false,
      where: {},
    })

    expect(docs).toHaveLength(1)
    const version = (docs[0] as Record<string, unknown>).version as Record<string, unknown>
    const siteName = version.siteName as Record<string, string>
    expect(siteName.ar).toBe(`جامعة الاختبار ${suffix}`)
    expect(siteName.en).toBe(`Backfill Test University ${suffix}`)
    expect(version.contactEmail).toBe(`backfill-${suffix}@example.test`)
  })

  it('does not invent a version for a global that has never been saved', async () => {
    // The adapter returns an empty object rather than undefined for a global
    // with no row, so this is the case a falsiness check silently got wrong:
    // it wrote an empty "initial version" for every unsaved global.
    for (const slug of ['about-page', 'contact-settings', 'navbar-settings', 'footer-settings'] as const) {
      const main = await payload.db.findGlobal({ slug, where: {} })
      if ((main as { id?: unknown })?.id !== undefined) continue

      const { totalDocs } = await payload.db.countGlobalVersions({ global: slug, where: {} })
      expect(totalDocs, `${slug} has no content and must have no version`).toBe(0)
    }
  })

  it('preserves the publication state of each document', async () => {
    const collegeVersion = await latestVersion('colleges', collegeId)
    const programVersion = await latestVersion('academic-programs', programId)

    expect((collegeVersion.version as Record<string, unknown>)._status).toBe('published')
    // The draft programme must NOT have been published by the backfill.
    expect((programVersion.version as Record<string, unknown>)._status).toBe('draft')
    expect(collegeVersion.latest).toBe(true)
    expect(collegeVersion.autosave).not.toBe(true)
  })

  it('preserves both locales of localized content', async () => {
    const collegeVersion = await latestVersion('colleges', collegeId)
    const version = collegeVersion.version as Record<string, unknown>
    const name = version.name as Record<string, string>

    expect(name.ar).toBe(`كلية الاختبار ${suffix}`)
    expect(name.en).toBe(`Backfill Test College ${suffix}`)
  })

  it('preserves relationships', async () => {
    const planVersion = (await latestVersion('study-plans', studyPlanId)).version as Record<
      string,
      unknown
    >
    expect(planVersion.academicProgram).toBe(programId)
    expect(planVersion.college).toBe(collegeId)

    const departmentVersion = (await latestVersion('academic-departments', departmentId))
      .version as Record<string, unknown>
    expect(departmentVersion.college).toBe(collegeId)
  })

  it('preserves arrays and their nested fields, in order', async () => {
    const planVersion = (await latestVersion('study-plans', studyPlanId)).version as Record<
      string,
      unknown
    >
    const courses = planVersion.courses as Array<Record<string, unknown>>

    expect(courses).toHaveLength(2)
    expect(courses[0]?.code).toBe('AAU-101')
    expect(courses[0]?.credits).toBe(3)
    expect(courses[0]?.semester).toBe('1')
    expect(courses[1]?.code).toBe('AAU-102')
    expect(courses[1]?.credits).toBe(4)
    expect(courses[1]?.semester).toBe('2')
    // Localized array subfields travel through the version locale tables.
    expect((courses[0]?.name as Record<string, string>).ar).toBe(`مقدمة ${suffix}`)
  })

  it('is idempotent: a second run creates nothing and changes nothing', async () => {
    const before = await latestVersion('colleges', collegeId)

    const second = await runVersionBackfill(payload)
    expect(second.created).toBe(0)
    expect(second.skipped).toBe(second.examined)

    expect(await countVersions('colleges', collegeId)).toBe(1)
    expect(await countVersions('study-plans', studyPlanId)).toBe(1)

    const after = await latestVersion('colleges', collegeId)
    expect(after.id).toBe(before.id)
  }, 120_000)

  it('leaves genuine editorial history alone', async () => {
    // A document that has been edited since the backfill has two versions; a
    // further run must not add a third or disturb which one is latest.
    await payload.update({
      collection: 'colleges',
      context: FIXTURE_CONTEXT,
      data: { icon: 'library' },
      id: collegeId,
      overrideAccess: true,
    })
    const afterEdit = await countVersions('colleges', collegeId)
    expect(afterEdit).toBeGreaterThan(1)

    const third = await runVersionBackfill(payload)
    expect(third.created).toBe(0)
    expect(await countVersions('colleges', collegeId)).toBe(afterEdit)
  }, 120_000)

  /**
   * The gate has to be able to SEE each failure, not merely agree with a
   * correct database. Each case is injected inside a transaction that is rolled
   * back, so the assertions above stay true and nothing is left behind.
   */
  it('the acceptance gate detects every failure it claims to', async () => {
    const { readFileSync } = await import('node:fs')
    const sql = readFileSync('migration/scripts/sql/versions_contract.sql', 'utf8')

    const probeAfter = async (client: Client, injection: string): Promise<Map<string, string>> => {
      await client.query(injection)
      const { rows } = await client.query<Record<string, string>>(sql)
      return new Map(
        rows
          .map((row) => Object.values(row)[0] as string)
          .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
      )
    }

    const cases: Array<{ inject: string; key: string }> = [
      {
        // A document that predates versioning and was not backfilled.
        inject: `INSERT INTO colleges (slug, _status, updated_at, created_at)
                 VALUES ('gate-check-missing', 'published', now(), now())`,
        key: 'documents_missing_latest',
      },
      {
        // A canonical version that unpublished its document.
        inject: `INSERT INTO colleges (slug, _status, updated_at, created_at)
                   VALUES ('gate-check-status', 'published', now(), now());
                 INSERT INTO _colleges_v (parent_id, latest, version__status, updated_at, created_at)
                   SELECT id, true, 'draft', now(), now() FROM colleges WHERE slug = 'gate-check-status'`,
        key: 'latest_version_status_mismatches',
      },
      {
        // A backfill that ran twice without being idempotent.
        inject: `INSERT INTO colleges (slug, _status, updated_at, created_at)
                   VALUES ('gate-check-duplicate', 'published', now(), now());
                 INSERT INTO _colleges_v (parent_id, latest, version__status, updated_at, created_at)
                   SELECT id, true, 'published', now(), now() FROM colleges WHERE slug = 'gate-check-duplicate';
                 INSERT INTO _colleges_v (parent_id, latest, version__status, updated_at, created_at)
                   SELECT id, true, 'published', now(), now() FROM colleges WHERE slug = 'gate-check-duplicate'`,
        key: 'documents_with_duplicate_latest',
      },
      {
        // A latest version with no parent — a phantom row in the Admin list.
        inject: `INSERT INTO _colleges_v (parent_id, latest, version__status, updated_at, created_at)
                 VALUES (NULL, true, 'published', now(), now())`,
        key: 'orphan_latest_versions',
      },
      {
        // An autosave draft standing in for a real saved version.
        inject: `INSERT INTO colleges (slug, _status, updated_at, created_at)
                   VALUES ('gate-check-autosave', 'published', now(), now());
                 INSERT INTO _colleges_v (parent_id, latest, autosave, version__status, updated_at, created_at)
                   SELECT id, true, true, 'published', now(), now() FROM colleges WHERE slug = 'gate-check-autosave'`,
        key: 'autosave_latest_versions',
      },
      {
        // A global holding content with no history to roll back to.
        inject: `DELETE FROM _site_settings_v`,
        key: 'globals_without_version',
      },
    ]

    for (const testCase of cases) {
      const client = new Client({ connectionString: process.env.DATABASE_URI })
      await client.connect()
      try {
        await client.query('BEGIN')
        // Measure the counter BEFORE the injection, in the same transaction.
        // Asserting only that it ends up non-zero proves nothing if it was
        // already non-zero — an unrelated document in this shared database
        // missing a latest version would make the case pass while the
        // injection changed nothing, and the gate would be credited with
        // detecting a failure it cannot actually see. The clean-baseline test
        // below does not cover this: it runs after this one.
        const baseline = await probeAfter(client, 'SELECT 1')
        expect(
          Number(baseline.get(testCase.key)),
          `${testCase.key} must start at 0, or this case proves nothing`,
        ).toBe(0)
        const probe = await probeAfter(client, testCase.inject)
        expect(
          Number(probe.get(testCase.key)),
          `${testCase.key} should be non-zero for its own failure`,
        ).toBeGreaterThan(0)
      } finally {
        await client.query('ROLLBACK').catch(() => undefined)
        await client.end()
      }
    }
  }, 120_000)

  it('satisfies the acceptance gate neon-import.sh runs before promotion', async () => {
    const { readFileSync } = await import('node:fs')
    const sql = readFileSync('migration/scripts/sql/versions_contract.sql', 'utf8')

    const client = new Client({ connectionString: process.env.DATABASE_URI })
    await client.connect()
    try {
      const { rows } = await client.query<{ line: string }>(sql)
      const probe = new Map(
        rows
          .map((row) => Object.values(row)[0] as string)
          .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
      )

      // Exactly the assertions the import makes, against a real schema.
      expect(probe.get('documents_without_exactly_one_latest')).toBe('0')
      expect(probe.get('documents_missing_latest')).toBe('0')
      expect(probe.get('documents_with_duplicate_latest')).toBe('0')
      expect(probe.get('orphan_latest_versions')).toBe('0')
      expect(probe.get('latest_version_status_mismatches')).toBe('0')
      expect(probe.get('autosave_latest_versions')).toBe('0')
      expect(probe.get('globals_without_version')).toBe('0')
      expect(Number(probe.get('documents_total'))).toBeGreaterThanOrEqual(4)
      expect(probe.get('latest_versions_total')).toBe(probe.get('documents_total'))
    } finally {
      await client.end()
    }
  }, 120_000)
})
