import { Container } from '@/components/ui/Container'
import { FacultyCard } from '@/components/cards/FacultyCard'
import type { Locale } from '@/i18n/locale'
import { getCollegeFaculty, type PublicCollegeFacultyItem } from '@/lib/payload/get-public-colleges'
import {
  PUBLIC_CONTENT_READ_CONTEXT,
  type ContentReadContext,
} from '@/lib/payload/content-read-context'

export async function CollegeFaculty({
  collegeSlug,
  locale,
  readContext = PUBLIC_CONTENT_READ_CONTEXT,
}: {
  collegeSlug: string
  locale: Locale
  readContext?: ContentReadContext
}) {
  const faculty: PublicCollegeFacultyItem[] = await getCollegeFaculty(
    collegeSlug,
    readContext.draft
      ? { locale, draft: true, user: readContext.user }
      : { locale },
  )

  if (faculty.length === 0) return null;

  return (
    <section className="py-20 bg-muted/20">
      <Container>
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {locale === 'ar' ? 'أعضاء هيئة التدريس' : 'Faculty Members'}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {faculty.map((member) => {
            const adaptedMember = {
              id: member.id,
              slug: member.slug,
              fullName: member.fullName,
              academicTitle: member.academicTitle,
              email: member.email,
              photo: member.photo ? { url: member.photo } : null,
            } as any;
            return <FacultyCard key={member.id} member={adaptedMember} isAr={locale === 'ar'} />
          })}
        </div>
      </Container>
    </section>
  )
}
