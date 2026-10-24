import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  'aria-hidden': ariaHidden = true,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      aria-hidden={ariaHidden}
      className={cn('skeleton-pulse animate-pulse rounded-md bg-muted/60', className)}
    />
  )
}

export { Skeleton }
