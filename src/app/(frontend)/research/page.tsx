import { redirect } from 'next/navigation'

/**
 * /research — redirect to the journal landing page.
 *
 * The legacy site keeps the scientific journal as the canonical landing
 * page for the Research section. Articles live under /research/articles,
 * and /research itself just redirects to /research/journal so the URL
 * matches the navigation label.
 */
export default function ResearchIndexPage(): never {
  redirect('/research/journal')
}
