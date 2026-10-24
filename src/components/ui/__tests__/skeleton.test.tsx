import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('is hidden from assistive technology by default', () => {
    render(<Skeleton data-testid="skeleton" />)

    expect(screen.getByTestId('skeleton').getAttribute('aria-hidden')).toBe('true')
  })

  it('allows callers to expose meaningful loading content', () => {
    render(<Skeleton aria-hidden={false} data-testid="visible-skeleton" />)

    expect(screen.getByTestId('visible-skeleton').getAttribute('aria-hidden')).toBe('false')
  })
})
