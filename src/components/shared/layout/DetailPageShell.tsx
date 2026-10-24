import type { ReactNode } from 'react'

import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/utils'

interface DetailPageShellProps {
  children: ReactNode
  sidebar?: ReactNode
  className?: string
}

export function DetailPageShell({ children, sidebar, className }: DetailPageShellProps) {
  return (
    <Container className={cn('py-10 md:py-14 lg:py-16', className)}>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">{children}</div>
        {sidebar ? <aside className="min-w-0 lg:sticky lg:top-28">{sidebar}</aside> : null}
      </div>
    </Container>
  )
}
