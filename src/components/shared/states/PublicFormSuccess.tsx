'use client'

import { CheckCircle2 } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { Button } from '@/components/ui/Button'

interface PublicFormSuccessProps {
  title: string
  message: string
  resetLabel: string
  onReset: () => void
}

export const PublicFormSuccess = forwardRef<HTMLDivElement, PublicFormSuccessProps>(
  function PublicFormSuccess({ title, message, resetLabel, onReset }, ref) {
    const statusRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => statusRef.current as HTMLDivElement, [])

    useEffect(() => {
      statusRef.current?.focus()
    }, [])

    return (
      <div
        ref={statusRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        className="mx-auto max-w-xl rounded-2xl border border-secondary/40 bg-secondary/5 p-8 text-center outline-none"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-foreground">{title}</h3>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={onReset} className="min-h-11">
          {resetLabel}
        </Button>
      </div>
    )
  },
)
