import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import { Container } from '@/components/ui/Container'
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  isLocale,
  type Locale,
} from '@/i18n/locale'
import { getPublicCollegesList } from '@/lib/payload/get-public-colleges'
import { getProgramOptionsByColleges } from '@/lib/payload/get-public-programs'
import { getPublicStudentAffairsDocuments } from '@/lib/payload/get-public-student-affairs-documents'

import {
  AdmissionForm,
  type AdmissionCollegeOption,
} from '@/components/pages/admission'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'القبول والتسجيل' : 'Admission & Registration'
  const description = isAr
    ? 'قدّم طلب الالتحاق بجامعة الجيل الجديد عبر النموذج الإلكتروني المطور.'
    : 'Apply to Al-Jeel Al-Jadeed University through the modern online admission form.'
  return { title, description, openGraph: { title, description } }
}

export default async function AdmissionPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<AdmissionSkeleton />}>
      <AdmissionContent locale={locale} />
    </Suspense>
  )
}

export async function AdmissionContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const [colleges, studentAffairsDocs] = await Promise.all([
    getPublicCollegesList({ locale, limit: 50 }),
    getPublicStudentAffairsDocuments({ locale }),
  ])

  // One batched query fetches every college's program options at once
  // (replaces the per-college getCollegePrograms N+1 pattern).
  const programsByCollege = await getProgramOptionsByColleges(
    colleges.map((college) => college.id),
    locale,
  )
  const collegesWithOptions: AdmissionCollegeOption[] = colleges.map((college) => ({
    id: typeof college.id === 'number' ? college.id : Number(college.id),
    slug: college.slug,
    name: college.name || '',
    programs: programsByCollege[String(college.id)] ?? [],
  }))

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12">
      {/* Dynamic light/dark grid background wrapper */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50 pointer-events-none" />

      {/* Premium Ambient Background Spotlights */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-60 -right-60 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 mx-auto mb-10 max-w-4xl px-4 text-center">
        <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
          {isAr ? 'القبول والتسجيل' : 'Admission & Registration'}
        </h1>
      </div>

      <AdmissionForm
        colleges={collegesWithOptions}
        locale={locale}
        studentAffairsDocs={studentAffairsDocs}
      />
    </div>
  )
}

function AdmissionSkeleton() {
  return (
    <div className="min-h-screen bg-background py-20 flex items-center justify-center">
      <Container className="skeleton-pulse max-w-3xl space-y-8 animate-pulse">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-48 rounded-full bg-muted" />
          <div className="mx-auto h-12 w-80 rounded-xl bg-muted" />
          <div className="mx-auto h-2 w-36 rounded-full bg-muted" />
          <div className="mx-auto h-6 w-full max-w-96 rounded bg-muted" />
        </div>
        <div className="h-[550px] w-full rounded-3xl bg-muted" />
      </Container>
    </div>
  )
}
