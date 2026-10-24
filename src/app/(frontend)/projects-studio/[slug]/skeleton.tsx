import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/skeleton'

export function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-16 pt-32">
      <Container className="mb-8">
        <Skeleton className="mb-6 h-4 w-full max-w-xs" />
        <Skeleton className="mb-4 h-7 w-40 rounded-xl" />
        <Skeleton className="h-12 w-full max-w-3xl rounded-xl" />
      </Container>
      <DetailPageShell sidebar={<Skeleton className="h-80 w-full rounded-3xl" />}>
        <div className="space-y-8">
          <Skeleton className="aspect-video w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </DetailPageShell>
    </div>
  )
}
