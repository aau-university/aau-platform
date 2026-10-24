import type { ReactNode } from 'react'
import { FileQuestion } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Pre-localized message. Caller resolves the locale string before passing in. */
  message?: string
  /** Optional title rendered above the message. */
  title?: string
  /** Optional icon override. Defaults to {@link FileQuestion}. */
  icon?: ReactNode
  /** Optional call-to-action rendered under the message. */
  action?: ReactNode
  className?: string
  /** Minimum height of the empty state container. Defaults to 400px. */
  minHeight?: number | string
}

/**
 * Centered "nothing to show" state.
 *
 * Ported from the legacy `frontend/components/common/EmptyState.tsx`. The
 * legacy version took parallel `messageAr` / `messageEn` strings and read
 * the active language from `useLanguage`. This port accepts a single
 * pre-localized `message` string — route-bound pages already have the
 * locale at the server boundary, so they can pass the right string in
 * without forcing this leaf to be a client component.
 *
 * Renders `role="status"` so screen readers announce the empty state.
 */
export function EmptyState({
  message = 'No data to display',
  title,
  icon,
  action,
  className,
  minHeight = 400,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-4',
        className,
      )}
      style={{ minHeight }}
    >
      {icon ?? <FileQuestion className="h-16 w-16 text-muted-foreground" aria-hidden="true" />}
      {title ? (
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      ) : null}
      <p className="max-w-md text-center text-lg text-muted-foreground">
        {message}
      </p>
      {action ?? null}
    </div>
  )
}

export default EmptyState
