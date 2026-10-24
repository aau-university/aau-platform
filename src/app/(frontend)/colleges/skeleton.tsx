import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton fallback for the `/colleges` list page.
 *
 * Rendered inside `<Suspense>` while the async `getPublicCollegesList`
 * fetch resolves. Mirrors the layout of the real page (hero + grid) so
 * the transition to populated content is visually smooth.
 */
export function CollegesListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-10 text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-32 rounded-full" />
          <Skeleton className="mx-auto mb-4 h-12 w-72" />
          <Skeleton className="mx-auto h-1.5 w-32 rounded-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
