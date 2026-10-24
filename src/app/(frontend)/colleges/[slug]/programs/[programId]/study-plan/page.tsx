import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getCollegeBySlug, getCollegeProgram } from '@/lib/payload/get-public-colleges'
import { getProgramStudyPlan } from '@/lib/payload/get-public-study-plans'
import { buildAcademicProgramPath, buildStudyPlanPath } from '@/utilities/collectionRoutes'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { generateMeta } from '@/utilities/generateMeta'
import { assertPreviewDocument, getDraftPreviewContextFromSearchParams, resolvePreviewLocale, type DraftPreviewContext, type PreviewSearchParams } from '@/lib/payload/preview-context'
import { asPreviewMetadata } from '@/utilities/previewMetadata'
import { alignDraftPreviewPath } from '@/lib/payload/preview-page-path'

import { StudyPlanHero, StudyPlanCourses } from '@/components/pages/study-plan'
import { totalCredits } from '@/components/pages/study-plan/utils'
import { StudyPlanSkeleton } from './skeleton'
import type { AcademicProgram } from '@/payload-types'

/**
 * `/colleges/[slug]/programs/[programId]/study-plan` — the study plan for
 * a single academic program.
 *
 * Resolves the program (scoped to the college slug) and its parent
 * college, then loads the program's active study plan by numeric id. The
 * program/college must exist (else 404); a program without a plan renders
 * a friendly empty state rather than a 404. Fully dynamic via the
 * top-level `await params` + `await cookies()` reads.
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

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, programId } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const plan = preview.draft
    ? await getProgramStudyPlan(programId, {
        locale,
        draft: true,
        documentId: preview.documentId,
        user: preview.user,
      })
    : null
  const program = populatedProgram(plan?.academicProgram) ?? await getCollegeProgram(slug, programId, {
    locale,
  })
  if (plan) assertPreviewDocument(preview, 'study-plans', plan.id)

  const title =
    locale === 'ar'
      ? `الخطة الدراسية - ${program?.name || ''}`
      : `Study Plan - ${program?.name || ''}`

  return asPreviewMetadata(generateMeta({
    doc: program
      ? {
          title,
          college: plan?.college ?? { slug },
          academicProgram: program,
        }
      : null,
    collectionSlug: 'study-plans',
  }), preview.draft)
}

function populatedProgram(value: unknown): AcademicProgram | null {
  return value && typeof value === 'object' && 'id' in value && 'slug' in value
    ? (value as AcademicProgram)
    : null
}

function relationshipSlug(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const slug = (value as { slug?: unknown }).slug
  return typeof slug === 'string' && slug.trim() ? slug : null
}

async function StudyPlanPageContent({
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
  const previewPlan = preview.draft
    ? await getProgramStudyPlan(programId, {
        locale,
        draft: true,
        documentId: preview.documentId,
        user: preview.user,
      })
    : null
  const relatedProgram = populatedProgram(previewPlan?.academicProgram)
  const resolvedCollegeSlug = relationshipSlug(previewPlan?.college) ?? slug
  const resolvedProgramSlug = relatedProgram?.slug ?? programId
  const program = relatedProgram ?? await getCollegeProgram(
    resolvedCollegeSlug,
    resolvedProgramSlug,
    { locale },
  )
  const college = await getCollegeBySlug(resolvedCollegeSlug, {
    locale,
    draft: preview.draft,
    user: preview.user ?? undefined,
  })
  if (!program || !college) notFound()

  const plan = previewPlan ?? await getProgramStudyPlan(program.id, { locale })
  if (plan) assertPreviewDocument(preview, 'study-plans', plan.id)
  if (preview.draft && !plan) notFound()
  if (plan) {
    alignDraftPreviewPath(
      preview,
      'study-plans',
      `/colleges/${slug}/programs/${programId}/study-plan`,
      plan as unknown as Record<string, unknown>,
    )
  }

  const isAr = locale === 'ar'
  const programHref = buildAcademicProgramPath(resolvedCollegeSlug, resolvedProgramSlug) ?? '/'
  const courses = plan?.courses ?? []
  // Count distinct real academic years only — courses with a blank
  // (optional) year must not inflate the hero's "Years" stat.
  const yearCount = new Set(
    courses.map((c) => c.year).filter((y): y is number => typeof y === 'number'),
  ).size

  return (
    <>
      <StudyPlanHero
        locale={locale}
        planName={
          plan?.name || (isAr ? `الخطة الدراسية - ${program.name}` : `Study Plan - ${program.name}`)
        }
        collegeName={college.name}
        collegeSlug={resolvedCollegeSlug}
        programName={program.name}
        programHref={programHref}
        totalCredits={totalCredits(courses)}
        courseCount={courses.length}
        yearCount={yearCount}
      />
      <StudyPlanCourses courses={courses} locale={locale} />
    </>
  )
}

export default async function StudyPlanPage({ params, searchParams }: PageProps) {
  const { slug, programId } = await params
  const [requestedLocale, preview] = await Promise.all([resolveLocale(), getDraftPreviewContextFromSearchParams(searchParams)])
  const locale = resolvePreviewLocale(preview, requestedLocale)
  const requestedPath = buildStudyPlanPath(slug, programId)
  if (!preview.draft && requestedPath) await PayloadRedirects({ url: requestedPath })

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<StudyPlanSkeleton />}>
        <StudyPlanPageContent slug={slug} programId={programId} locale={locale} preview={preview} />
      </Suspense>
    </div>
  )
}
