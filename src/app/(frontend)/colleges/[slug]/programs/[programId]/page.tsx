import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import {
  getCollegeBySlug,
  getCollegeProgram,
} from '@/lib/payload/get-public-colleges'
import { getProgramStudyPlan } from '@/lib/payload/get-public-study-plans'
import { buildAcademicProgramPath, buildStudyPlanPath } from '@/utilities/collectionRoutes'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'

import { ProgramHero, ProgramStats, ProgramContent, ProgramKeyInstructors } from '@/components/pages/program-detail'
import { getProgramKeyInstructors } from '@/lib/payload/get-public-colleges'
import { ProgramDetailSkeleton } from './skeleton'

/**
 * `/colleges/[slug]/programs/[programId]` detail page (PR-036).
 *
 * Ported from the legacy
 * `frontend/app/(public)/colleges/[id]/programs/[programId]/page.tsx` +
 * `frontend/components/ProgramDetailsContent.tsx`. The legacy version was
 * a client component driven by `useLanguage` / `useRouter`; this port is
 * a Server Component that:
 *
 *   - Awaits `params` (Next 15+ async dynamic API).
 *   - Resolves the locale from the `aau_lang` cookie.
 *   - Calls the new {@link getCollegeProgram} loader (which scopes the
 *     program to the college slug so a URL like
 *     `/colleges/medicine/programs/cafeteria-program` 404s cleanly).
 *   - `notFound()`s when the program or its parent college is missing.
 *   - Renders rich-text fields (description, objectives, career
 *     prospects, why program, application steps) through the shared
 *     {@link RichText} component.
 *   - Wraps the async fetch in `<Suspense>` (cacheComponents requirement)
 *     with the {@link ProgramDetailSkeleton} fallback.
 *   - Generates metadata from the program's SEO + title fields.
 *
 * No `export const dynamic` / `revalidate` — the route is fully dynamic
 * via the top-level `await params` + `await cookies()` calls.
 */

type PageProps = {
  params: Promise<{ slug: string; programId: string }>
  searchParams: PreviewSearchParams
}

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

function relationshipSlug(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = (value as { slug?: unknown }).slug
  return typeof slug === 'string' && slug.trim() ? slug : null
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, programId } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const program = await getCollegeProgram(slug, programId, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (program) assertPreviewDocument(preview, 'academic-programs', program.id)

  return asPreviewMetadata(generateMeta({
    doc: program
      ? {
          title: program.name,
          slug: program.slug,
          college: program.college,
          meta: program.meta,
        }
      : null,
    collectionSlug: 'academic-programs',
    locale,
  }), preview.draft)
}

async function ProgramDetail({
  slug,
  programId,
  locale,
  preview,
}: {
  slug: string
  programId: string
  locale: Locale
  preview: DraftPreviewContext
}) {
  // Resolve the Preview document by its Redis-bound ID first. Its populated
  // college relationship, rather than the requested URL, is the parent route
  // authority when either slug changed in a Draft.
  // Instructors are fetched separately because getProgramKeyInstructors
  // queries the `program` hasMany relationship by exact numeric ID (equals),
  // not by slug — so we need the resolved program's id first.
  const program = await getCollegeProgram(slug, programId, {
    locale,
    draft: preview.draft,
    documentId: preview.draft ? preview.documentId : undefined,
    user: preview.user ?? undefined,
  })
  if (!program) notFound()
  assertPreviewDocument(preview, 'academic-programs', program.id)
  alignDraftPreviewPath(
    preview,
    'academic-programs',
    `/colleges/${slug}/programs/${programId}`,
    program as unknown as Record<string, unknown>,
  )

  const resolvedCollegeSlug = relationshipSlug(program.college) ?? slug
  const college = await getCollegeBySlug(resolvedCollegeSlug, {
    locale,
    draft: preview.draft,
    user: preview.user ?? undefined,
  })
  if (!college) notFound()

  // Now fetch instructors using the program's numeric ID (not the URL slug).
  // The loader coerces to a number internally; passing the raw id avoids
  // any chance of a slug leaking into the relationship query.
  // The study plan is fetched in parallel so the hero + sidebar can link
  // to it only when one actually exists (otherwise those affordances stay
  // disabled instead of 404ing).
  const [instructors, studyPlan] = await Promise.all([
    getProgramKeyInstructors(String(program.id), {
      locale,
      draft: preview.draft,
      user: preview.user ?? undefined,
    }).catch(() => []),
    getProgramStudyPlan(program.id, {
      locale,
      draft: preview.draft,
      user: preview.user ?? undefined,
    }).catch(() => null),
  ])

  const studyPlanHref = studyPlan
    ? buildStudyPlanPath(resolvedCollegeSlug, program.slug) ?? undefined
    : undefined

  return (
    <>
      <ProgramHero
        program={program}
        college={college}
        locale={locale}
        studyPlanHref={studyPlanHref}
      />
      <ProgramStats program={program} locale={locale} />
      <ProgramContent program={program} locale={locale} studyPlanHref={studyPlanHref} />
      {instructors && instructors.length > 0 && (
        <ProgramKeyInstructors instructors={instructors} collegeSlug={slug} />
      )}
    </>
  )
}

export default async function ProgramDetailPage({ params, searchParams }: PageProps) {
  const { slug, programId } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildAcademicProgramPath(slug, programId)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<ProgramDetailSkeleton />}>
        <ProgramDetail slug={slug} programId={programId} locale={locale} preview={preview} />
      </Suspense>
    </div>
  )
}
