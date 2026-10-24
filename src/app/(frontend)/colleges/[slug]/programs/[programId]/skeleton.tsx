import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton fallback for the `/colleges/[slug]/programs/[programId]` page.
 *
 * Rendered inside `<Suspense>` while the async `getCollegeProgram` fetch
 * resolves. Mirrors the layout of the real page (hero + rich-text
 * sections) so the transition to populated content is visually smooth.
 */
export function ProgramDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-6 w-64 rounded-full" />
        <Skeleton className="mb-3 h-10 w-24 rounded-full" />
        <Skeleton className="mb-4 h-12 w-full max-w-96" />
        <Skeleton className="mb-8 h-1.5 w-32 rounded-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-12 h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-3/4" />
      </div>
    </div>
  )
}
