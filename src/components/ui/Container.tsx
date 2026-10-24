import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Container — fixed-max-width centred wrapper used by every homepage section.
 *
 * Provides one responsive content gutter so sections stay aligned.
 */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('container mx-auto px-4 sm:px-6 lg:px-8', className)} {...props} />
}
