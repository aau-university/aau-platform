import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Users } from 'lucide-react'

import { Breadcrumb } from '@/components/Breadcrumb'
import { TeamMemberCard } from '@/components/cards/TeamMemberCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Container } from '@/components/ui/Container'
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from '@/i18n/locale'
import { getPublicTeamMembers } from '@/lib/payload/get-public-team-members'

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANG_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale()
  const isAr = locale === 'ar'
  const title = isAr ? 'فريق العمل' : 'Our Team'
  const description = isAr
    ? 'تعرّف على فريق العمل في جامعة الجيل الجديد'
    : 'Meet the team behind AAU'
  return { title, description, openGraph: { title, description } }
}

export default async function TeamPage() {
  const locale = await resolveLocale()

  return (
    <Suspense fallback={<TeamSkeleton />}>
      <TeamContent locale={locale} />
    </Suspense>
  )
}

async function TeamContent({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar'
  const members = await getPublicTeamMembers({ locale, limit: 24 })

  return (
    <div className="min-h-screen bg-background py-16">
      <Container>
        <Breadcrumb items={[{ label: isAr ? 'فريق العمل' : 'Our Team' }]} locale={locale} />

        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Users className="h-4 w-4" />
            {isAr ? 'فريقنا' : 'Our Team'}
          </div>
          <h1 className="mb-4 py-2 font-display text-4xl font-bold md:text-5xl">
            {isAr ? 'فريق العمل' : 'Our Team'}
          </h1>
          <div className="mx-auto mb-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-primary to-secondary" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {isAr ? 'تعرّف على فريق العمل في جامعة الجيل الجديد' : 'Meet the team behind AAU'}
          </p>
        </div>

        {members.length === 0 ? (
          <EmptyState
            title={isAr ? 'لا يوجد أعضاء' : 'No team members available'}
            message={
              isAr
                ? 'لا يوجد أعضاء منشورون حالياً.'
                : 'No published team members available right now.'
            }
            icon={<Users className="h-16 w-16 text-muted-foreground" />}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {members.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 text-center">
          <div className="mx-auto mb-4 h-6 w-24 rounded-full bg-muted" />
          <div className="mx-auto mb-4 h-12 w-full max-w-48 rounded-xl bg-muted" />
          <div className="mx-auto h-1.5 w-full max-w-32 rounded-full bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
