'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-[color,background-color,border-color,box-shadow,transform] duration-200 motion-reduce:transform-none motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
        primary: 'bg-secondary text-primary hover:bg-secondary/90 shadow-gold hover:shadow-glow focus-visible:ring-secondary hover:-translate-y-0.5 active:translate-y-0',
        secondary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary shadow-sm hover:-translate-y-0.5 active:translate-y-0',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:-translate-y-0.5 active:translate-y-0',
        outline: 'border border-foreground/30 bg-transparent text-foreground hover:bg-foreground/5 hover:border-foreground/50 hover:-translate-y-0.5 active:translate-y-0',
        ghost: 'text-foreground hover:bg-foreground/10 active:scale-95',
        link: 'h-auto p-0 text-secondary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 text-base',
        sm: 'h-11 min-h-11 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'size-11 min-h-11 min-w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = 'button', ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
