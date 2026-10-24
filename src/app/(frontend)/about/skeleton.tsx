import { Skeleton } from '@/components/ui/skeleton'

export function AboutPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-16 text-center">
          <Skeleton className="h-8 w-32 mx-auto rounded-full mb-6" />
          <Skeleton className="mx-auto mb-4 h-12 w-full max-w-96" />
          <Skeleton className="h-1.5 w-32 mx-auto rounded-full mb-6" />
          <Skeleton className="h-6 w-full max-w-3xl mx-auto" />
        </div>
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
