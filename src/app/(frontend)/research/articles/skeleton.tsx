import { Skeleton } from '@/components/ui/skeleton'

export function ArticlesListSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <Skeleton className="mx-auto mb-4 h-10 w-full max-w-72 rounded-full" />
        <Skeleton className="mx-auto mb-12 h-1 w-full max-w-24 rounded-full" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
