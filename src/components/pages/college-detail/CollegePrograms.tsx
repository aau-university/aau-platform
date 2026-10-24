import type { Locale } from '@/i18n/locale'
import {
  PUBLIC_CONTENT_READ_CONTEXT,
  type ContentReadContext,
} from '@/lib/payload/content-read-context'
import { getCollegeDepartmentsWithPrograms } from '@/lib/payload/get-public-colleges'
import { CollegeDepartmentsHierarchy } from './CollegeDepartmentsHierarchy'

export async function CollegePrograms({
  collegeSlug,
  locale,
  readContext = PUBLIC_CONTENT_READ_CONTEXT,
}: {
  collegeSlug: string
  locale: Locale
  readContext?: ContentReadContext
}) {
  // Fetch the new hierarchy: Departments -> HOD -> Programs
  const departments = await getCollegeDepartmentsWithPrograms(
    collegeSlug,
    readContext.draft
      ? { locale, draft: true, user: readContext.user }
      : { locale },
  )

  if (departments.length === 0) return null

  return <CollegeDepartmentsHierarchy collegeSlug={collegeSlug} departments={departments} />
}
