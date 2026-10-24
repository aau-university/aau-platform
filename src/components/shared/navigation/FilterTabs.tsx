'use client'

import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export interface FilterTabOption {
  label: string
  value: string
}

export interface FilterTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'children'> {
  ariaLabel: string
  options: readonly FilterTabOption[]
  value: string
  onValueChange: (value: string) => void
}

export function FilterTabs({
  ariaLabel,
  options,
  value,
  onValueChange,
  className,
  ...props
}: FilterTabsProps) {
  return (
    <div
      {...props}
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            className={cn(
              'min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface text-foreground hover:border-gold-foreground/50 hover:bg-secondary/10',
            )}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
