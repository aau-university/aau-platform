import { DetailPageShell } from '@/components/shared/layout/DetailPageShell'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/skeleton'

export function CenterDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-[50vh] items-center bg-primary pb-16 pt-36">
        <Container className="flex flex-col items-center">
          <Skeleton className="mb-8 h-4 w-full max-w-xs" />
          <Skeleton className="mb-6 h-7 w-32 rounded-full" />
          <Skeleton className="mb-6 h-12 w-full max-w-2xl rounded-xl" />
          <div className="flex w-full max-w-xl flex-wrap justify-center gap-3">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
        </Container>
      </div>
      <DetailPageShell sidebar={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <div className="space-y-8">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </DetailPageShell>
    </div>
  )
}
