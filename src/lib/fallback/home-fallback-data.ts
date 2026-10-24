/**
 * Shared view-model types for homepage sections.
 *
 * The hardcoded demo data (fake student/faculty counts, invented colleges
 * and news items) that used to live here was removed: sections now render
 * real CMS content or nothing at all. Presenting fabricated statistics as
 * fact was a credibility problem — real numbers are entered through the
 * admin panel (stats block items), not baked into code.
 */

export interface HomeFallbackCollege {
  id: string
  slug: string
  name: string
  description: string
  image?: string | null
  programsCount: number
  facultyCount: number
}

export interface HomeFallbackNewsItem {
  id: string
  slug: string
  title: string
  summary: string
  publishDate: string
  image?: string | null
}

export interface HomeFallbackStat {
  key: 'students' | 'faculty' | 'programs' | 'colleges'
  number: string
  label: string
  icon: 'students' | 'faculty' | 'programs' | 'colleges'
}
