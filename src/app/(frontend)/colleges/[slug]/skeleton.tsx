import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton fallback for the `/colleges/[slug]` detail page.
 *
 * Rendered inside the outer `<Suspense>` while the async `getCollegeBySlug`
 * fetch resolves. Mirrors the layout of the real page (hero + sections)
 * so the transition to populated content is visually smooth.
 */
export function CollegeDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-6 w-64 rounded-full" />
        <Skeleton className="mb-4 h-12 w-full max-w-96" />
        <Skeleton className="mb-8 h-1.5 w-32 rounded-full" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="mt-12 h-10 w-48" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact skeleton for an individual section (programs / faculty / news)
 * that streams in below the college header. Using a small dedicated
 * skeleton keeps the section fallback visually proportional to the
 * section's own height (the outer page skeleton would otherwise dwarf
 * each section).
 */
export function CollegeSectionSkeleton() {
  return (
    <div className="mt-12">
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

