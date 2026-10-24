import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton fallback for the `/faculty/[slug]` detail page.
 *
 * Rendered inside `<Suspense>` while the async `getPublicFacultyBySlug`
 * fetch resolves. Mirrors the layout of the real page (hero + sections)
 * so the transition to populated content is visually smooth.
 */
export function FacultyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-6 w-64 rounded-full" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
        </div>
      </div>
    </div>
  )
}
