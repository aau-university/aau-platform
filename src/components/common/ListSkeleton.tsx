import { Skeleton } from '@/components/common/Skeleton'

/**
 * Shared Suspense fallback for collection list routes
 * (`/news`, `/events`, `/blog`).
 *
 * Mirrors the 3-up responsive grid the live pages render so the
 * pre-hydration shell stays visually aligned with the post-fetch layout
 * (no major layout shift when the data streams in).
 *
 * Server Component — no client hooks, no `useLanguage`. Pure markup.
 */
export function ListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb + title hero */}
        <Skeleton className="mb-6 h-6 w-48" />
        <Skeleton className="mx-auto mb-4 h-12 w-64 rounded-full" />
        <Skeleton className="mx-auto mb-6 h-1.5 w-32 rounded-full" />
        <Skeleton className="mx-auto mb-12 h-5 w-96 max-w-full" />

        {/* Card grid (3-up) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border/50"
            >
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <Skeleton className="mx-auto mt-10 h-10 w-72" />
      </div>
    </div>
  )
}

export default ListSkeleton
