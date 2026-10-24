import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import {
  TeamMemberCard,
  type TeamMemberCardProps,
} from '@/components/cards/TeamMemberCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Locale } from '@/i18n/locale'
import {
  PUBLIC_CONTENT_READ_CONTEXT,
  type ContentReadContext,
} from '@/lib/payload/content-read-context'
import { getCollegeBySlug, getCollegeDepartmentsWithPrograms } from '@/lib/payload/get-public-colleges'
import { cn } from '@/lib/utils'
import { buildCollegeFacultyPath } from '@/utilities/collectionRoutes'

export async function CollegeLeadership({
  collegeSlug,
  locale,
  readContext = PUBLIC_CONTENT_READ_CONTEXT,
}: {
  collegeSlug: string
  locale: Locale
  readContext?: ContentReadContext
}) {
  const isAr = locale === 'ar'
  const facultyDirectoryHref = buildCollegeFacultyPath(collegeSlug) ?? '/colleges'
  
  // Fetch college details for the Dean
  const loaderOptions = readContext.draft
    ? { locale, draft: true as const, user: readContext.user }
    : { locale }
  const college = await getCollegeBySlug(collegeSlug, loaderOptions)
  
  // Fetch departments for the Heads of Departments
  const departments = await getCollegeDepartmentsWithPrograms(collegeSlug, loaderOptions)

  if (!college) return null;

  const leaders: TeamMemberCardProps['member'][] = [];

  // Add Dean if exists
  if (college.deanName) {
    leaders.push({
      id: 'dean',
      name: college.deanName,
      jobTitle: isAr ? 'عميد الكلية' : 'College Dean',
      image: college.deanImage,
    })
  }

  // Add HODs
  departments.forEach(dept => {
    if (dept.headOfDepartment) {
      leaders.push({
        id: `hod-${dept.id}`,
        name: dept.headOfDepartment.fullName,
        jobTitle: isAr ? `رئيس ${dept.name}` : `Head of ${dept.name}`,
        image: dept.headOfDepartment.photo,
      })
    }
  });

  if (leaders.length === 0) return null;

  return (
    <section id="faculty" className="py-20 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]" />
      <Container className="relative z-10">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <SectionHeader
              badge={isAr ? 'القيادات الأكاديمية' : 'Academic Leadership'}
              title={isAr ? 'رواد مسيرتنا الأكاديمية' : 'Pioneers of Our Academic Journey'}
              description={isAr ? 'تعرف على عمادة الكلية ورؤساء الأقسام الذين يقودون مسيرة التميز' : 'Meet the college dean and heads of departments leading the journey of excellence'}
            />
          </div>
          
          <Link
            href={facultyDirectoryHref}
            className="group flex items-center justify-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-6 py-3 text-sm font-medium text-secondary-foreground transition-all hover:bg-secondary/20 w-full md:w-auto text-center shrink-0"
          >
            {isAr ? 'تصفح دليل أعضاء هيئة التدريس بالكلية' : 'Browse College Faculty Directory'}
            <ArrowRight className={cn("h-4 w-4 transition-transform", isAr ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")} />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {leaders.map((leader) => (
            <div key={leader.id} className="h-full">
               <TeamMemberCard member={leader} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
