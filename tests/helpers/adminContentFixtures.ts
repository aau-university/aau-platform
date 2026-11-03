/**
 * Fixtures for the authenticated Admin content assertions.
 *
 * ── Why these fixtures exist in the shape they do ─────────────────────────
 * The 2026-09-14 Staging diagnosis found ten Admin pages returning HTTP 200
 * with a blank content area. Two independent conditions produced that, and
 * neither is visible to a status-code test:
 *
 *   1. the version tables were owned by the admin role, so Payload's
 *      `queryDrafts` died with SQLSTATE 42501; and
 *   2. the version tables were EMPTY, because the documents predate the PR #25
 *      change that gave those collections a draft workflow — and Payload serves
 *      the Admin list view for a draft-enabled collection from the version
 *      table.
 *
 * Both were properties of the one-time Neon import, which has been retired
 * together with its backfill. What remains asserted here is the user-visible
 * outcome: every fixture document is created normally, with its versions, and
 * the Admin views must show it.
 *
 * Pages and News are created the same way but keep their versions. They are the
 * controls: they were the two collections that kept working on staging, and a
 * change that breaks everything equally would otherwise look like a pass.
 */
import type { Payload } from 'payload'

const FIXTURE_CONTEXT = { disableRevalidate: true } as const

/**
 * One recognisable marker per route, so a list view cannot pass by rendering
 * somebody else's row.
 *
 * Every localized value is written in BOTH locales, and the Arabic one carries
 * real Arabic script alongside the ASCII marker. Arabic is this platform's
 * default locale and the language most of the migrated content is written in,
 * so a backfill that dropped the `ar` locale row would leave the Admin list
 * blank for real editors while looking perfectly fine in English. Because the
 * marker appears in both values, a list assertion can be locale-agnostic while
 * the dedicated localization test still pins each locale exactly.
 */
const ARABIC = 'عربي'
const marker = (name: string) => ({
  ar: `${ARABIC} ${name}`,
  en: `${name} EN`,
  /** The substring present in both locales. */
  any: name,
})

export const ADMIN_CONTENT_FIXTURE = {
  college: marker('PR27 Admin College'),
  department: marker('PR27 Admin Department'),
  program: marker('PR27 Admin Program'),
  facultyMember: marker('PR27 Admin Faculty Member'),
  studyPlan: marker('PR27 Admin Study Plan'),
  page: marker('PR27 Admin Page'),
  news: marker('PR27 Admin News'),
  siteName: marker('PR27 Admin Site Name'),
  aboutBadge: marker('PR27 Admin About Badge'),
} as const

const SLUGS = {
  college: 'pr27-admin-college',
  department: 'pr27-admin-department',
  program: 'pr27-admin-program',
  facultyMember: 'pr27-admin-faculty-member',
  studyPlan: 'pr27-admin-study-plan',
  page: 'pr27-admin-page',
  news: 'pr27-admin-news',
} as const

export async function createAdminContentFixtures(
  payload: Payload,
): Promise<void> {
  await deleteAdminContentFixtures(payload)

  /** Create in the default locale, then write the English value as a second
   *  locale-scoped update — so the document genuinely holds two locale rows. */
  const bilingual = async (
    collection: 'colleges' | 'academic-departments' | 'academic-programs' | 'faculty-members' | 'study-plans' | 'pages' | 'news',
    field: string,
    value: { ar: string; en: string },
    rest: Record<string, unknown>,
    /** Extra fields the English update must carry. A localized REQUIRED field
     *  inside an array is only satisfied per locale, so an update that touches
     *  only the top-level name fails validation on the array's own locale row. */
    enExtra: Record<string, unknown> = {},
  ): Promise<{ id: number | string }> => {
    const created = await payload.create({
      collection,
      context: FIXTURE_CONTEXT,
      data: { [field]: value.ar, ...rest } as never,
      locale: 'ar',
      overrideAccess: true,
    })
    await payload.update({
      collection,
      context: FIXTURE_CONTEXT,
      data: { [field]: value.en, ...enExtra } as never,
      id: created.id,
      locale: 'en',
      overrideAccess: true,
    })
    return created
  }

  const college = await bilingual('colleges', 'name', ADMIN_CONTENT_FIXTURE.college, {
    slug: SLUGS.college,
    _status: 'published',
  })

  const department = await bilingual(
    'academic-departments',
    'name',
    ADMIN_CONTENT_FIXTURE.department,
    { slug: SLUGS.department, college: college.id, _status: 'published' },
  )

  const program = await bilingual('academic-programs', 'name', ADMIN_CONTENT_FIXTURE.program, {
    slug: SLUGS.program,
    college: college.id,
    department: department.id,
    _status: 'published',
  })

  const facultyMember = await bilingual(
    'faculty-members',
    'fullName',
    ADMIN_CONTENT_FIXTURE.facultyMember,
    {
      slug: SLUGS.facultyMember,
      college: college.id,
      department: department.id,
      _status: 'published',
    },
  )

  const studyPlan = await bilingual(
    'study-plans',
    'name',
    ADMIN_CONTENT_FIXTURE.studyPlan,
    {
      slug: SLUGS.studyPlan,
      academicProgram: program.id,
      courses: [
        {
          code: 'PR27-101',
          name: `${ARABIC} PR27 Admin Course`,
          credits: 3,
          year: 1,
          semester: '1',
        },
      ],
      _status: 'published',
    },
    {
      courses: [
        { code: 'PR27-101', name: 'PR27 Admin Course EN', credits: 3, year: 1, semester: '1' },
      ],
    },
  )

  // The controls: created identically, versions left intact.
  await bilingual('pages', 'title', ADMIN_CONTENT_FIXTURE.page, {
    slug: SLUGS.page,
    // `layout` is required on Pages; one rich-text block is the smallest valid
    // document, matching tests/helpers/publicRoutesFixtures.ts.
    layout: [{ blockType: 'richText', heading: ADMIN_CONTENT_FIXTURE.page.any }],
    _status: 'published',
  })
  await bilingual('news', 'title', ADMIN_CONTENT_FIXTURE.news, {
    slug: SLUGS.news,
    _status: 'published',
  })

  for (const locale of ['ar', 'en'] as const) {
    await payload.updateGlobal({
      context: FIXTURE_CONTEXT,
      data: { siteName: ADMIN_CONTENT_FIXTURE.siteName[locale] },
      locale,
      overrideAccess: true,
      slug: 'site-settings',
    })
    await payload.updateGlobal({
      context: FIXTURE_CONTEXT,
      data: { header: { badge: ADMIN_CONTENT_FIXTURE.aboutBadge[locale] } },
      locale,
      overrideAccess: true,
      slug: 'about-page',
    })
  }
}

export async function deleteAdminContentFixtures(payload: Payload): Promise<void> {
  // Reverse dependency order: study plan -> faculty -> program -> department ->
  // college, so no delete is refused by a relationship still pointing at it.
  const ordered = [
    { collection: 'study-plans' as const, slug: SLUGS.studyPlan },
    { collection: 'faculty-members' as const, slug: SLUGS.facultyMember },
    { collection: 'academic-programs' as const, slug: SLUGS.program },
    { collection: 'academic-departments' as const, slug: SLUGS.department },
    { collection: 'colleges' as const, slug: SLUGS.college },
    { collection: 'news' as const, slug: SLUGS.news },
    { collection: 'pages' as const, slug: SLUGS.page },
  ]

  for (const target of ordered) {
    await payload
      .delete({
        collection: target.collection,
        context: FIXTURE_CONTEXT,
        overrideAccess: true,
        where: { slug: { equals: target.slug } },
      })
      .catch(() => undefined)
  }
}
