import { Skeleton } from '@/components/common/Skeleton'

/**
 * Shared Suspense fallback for collection detail routes
 * (`/news/[slug]`, `/events/[slug]`, `/blog/[slug]`).
 *
 * Mirrors the 2/3 + 1/3 sidebar layout the live pages render so the
 * pre-hydration shell stays visually aligned with the post-fetch layout.
 *
 * Server Component — no client hooks, no `useLanguage`. Pure markup.
 */
export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Skeleton className="mb-6 h-6 w-64" />

        {/* Hero */}
        <div className="mb-12 max-w-4xl space-y-4">
          <Skeleton className="h-12 w-3/4 rounded-xl" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Featured image */}
        <Skeleton className="mb-8 h-[300px] w-full rounded-2xl md:h-[420px]" />

        {/* Body + sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailSkeleton
