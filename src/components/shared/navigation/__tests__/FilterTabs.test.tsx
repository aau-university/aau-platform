import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FilterTabs } from '@/components/shared/navigation/FilterTabs'

describe('FilterTabs', () => {
  it('exposes controlled pressed state and reports selection', () => {
    const onValueChange = vi.fn()

    render(
      <FilterTabs
        ariaLabel="Filter articles"
        onValueChange={onValueChange}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Research', value: 'research' },
        ]}
        data-testid="article-filters"
        id="article-filter-tabs"
        value="all"
      />,
    )

    const group = screen.getByRole('group', { name: 'Filter articles' })
    const allButton = screen.getByRole('button', { name: 'All' })

    expect(group.getAttribute('id')).toBe('article-filter-tabs')
    expect(group.getAttribute('data-testid')).toBe('article-filters')
    expect(allButton.className).toContain('min-h-11')
    expect(allButton.className).toContain('min-w-11')
    expect(allButton.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Research' }).getAttribute('aria-pressed')).toBe(
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Research' }))
    expect(onValueChange).toHaveBeenCalledWith('research')
  })
})
