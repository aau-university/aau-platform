import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/skeleton'

export function BlogDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary pb-14 pt-32 md:pb-16">
        <Container>
          <Skeleton className="mb-8 h-4 w-full max-w-xs" />
          <Skeleton className="mb-5 h-7 w-32 rounded-full" />
          <Skeleton className="mb-6 h-12 w-full max-w-3xl rounded-xl" />
          <Skeleton className="h-9 w-full max-w-lg" />
        </Container>
      </div>
      <DetailPageShell sidebar={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <div className="space-y-8">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </DetailPageShell>
    </div>
  )
}
