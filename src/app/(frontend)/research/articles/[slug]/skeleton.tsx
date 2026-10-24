import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/skeleton'

export function ArticleDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-16 pt-32">
      <Container className="mb-8">
        <Skeleton className="mb-6 h-4 w-full max-w-sm" />
        <Skeleton className="mb-4 h-7 w-32 rounded-xl" />
        <Skeleton className="mb-6 h-12 w-full max-w-3xl rounded-xl" />
        <Skeleton className="h-16 w-full max-w-2xl" />
      </Container>
      <DetailPageShell sidebar={<Skeleton className="aspect-[4/3] w-full rounded-3xl" />}>
        <div className="space-y-8">
          <Skeleton className="h-52 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </DetailPageShell>
    </div>
  )
}
