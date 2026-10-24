import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton fallback for the
 * `/colleges/[slug]/programs/[programId]/study-plan` page. Mirrors the
 * hero (breadcrumb + title + stat pills) and the first year's semester
 * cards so the transition to populated content is smooth.
 */
export function StudyPlanSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-6 w-80 rounded-full" />
        <Skeleton className="mb-6 h-9 w-40 rounded-full" />
        <Skeleton className="mb-6 h-12 w-full max-w-md" />
        <div className="mb-12 flex flex-wrap gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-40 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
