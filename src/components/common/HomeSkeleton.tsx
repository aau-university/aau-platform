import { Container } from '@/components/ui/Container'

import { Skeleton } from './Skeleton'

export function HomeSkeleton() {
  return (
    <div aria-label="Loading homepage content" className="bg-background">
      <section className="min-h-[calc(100vh-5rem)] bg-primary py-16 text-primary-foreground">
        <Container>
          <div className="grid min-h-[520px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Skeleton className="h-7 w-40 bg-card/20" />
              <Skeleton className="h-14 w-full max-w-2xl bg-card/20" />
              <Skeleton className="h-14 w-4/5 max-w-xl bg-card/20" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full max-w-2xl bg-card/15" />
                <Skeleton className="h-4 w-5/6 max-w-xl bg-card/15" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-12 w-36 bg-secondary/50" />
                <Skeleton className="h-12 w-32 bg-card/15" />
              </div>
            </div>
            <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-card/15" />
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <Skeleton className="mx-auto h-10 w-64" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
        </Container>
      </section>
    </div>
  )
}
