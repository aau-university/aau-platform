import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Pagination } from '@/components/Pagination'

afterEach(cleanup)

describe('Pagination', () => {
  it('renders the first-page window and preserves bare/page query hrefs', () => {
    render(<Pagination currentPage={1} totalPages={10} basePath="/blog" locale="en" />)

    expect(screen.queryByRole('link', { name: 'Go to previous page' })).toBeNull()
    expect(screen.getByRole('link', { name: '1' }).getAttribute('href')).toBe('/blog')
    expect(screen.getByRole('link', { name: '1' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: '2' }).getAttribute('href')).toBe('/blog?page=2')
    expect(screen.getByRole('link', { name: '10' }).getAttribute('href')).toBe('/blog?page=10')
    expect(screen.getByRole('link', { name: 'Go to next page' }).getAttribute('href')).toBe(
      '/blog?page=2',
    )
    expect(screen.getAllByText('More pages')).toHaveLength(1)
  })

  it('retains the middle page window, ellipses, active page, and English controls', () => {
    render(<Pagination currentPage={5} totalPages={10} basePath="/news" locale="en" />)

    const navigation = screen.getByRole('navigation', { name: 'Pagination' })
    expect(within(navigation).getAllByText('More pages')).toHaveLength(2)
    expect(within(navigation).getByRole('link', { name: '4' }).getAttribute('href')).toBe(
      '/news?page=4',
    )
    expect(within(navigation).getByRole('link', { name: '5' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(within(navigation).getByRole('link', { name: '6' }).getAttribute('href')).toBe(
      '/news?page=6',
    )
    expect(within(navigation).getByText('Previous').className).toContain('hidden sm:inline')
    expect(within(navigation).getByText('Next').className).toContain('hidden sm:inline')
    expect(within(navigation).getByRole('link', { name: 'Go to previous page' }).innerHTML).toContain(
      'lucide-chevron-left',
    )
    expect(within(navigation).getByRole('link', { name: 'Go to next page' }).innerHTML).toContain(
      'lucide-chevron-right',
    )
  })

  it('renders the last-page window without a next target', () => {
    render(<Pagination currentPage={10} totalPages={10} basePath="/events" locale="en" />)

    expect(screen.getByRole('link', { name: 'Go to previous page' }).getAttribute('href')).toBe(
      '/events?page=9',
    )
    expect(screen.getByRole('link', { name: '9' }).getAttribute('href')).toBe('/events?page=9')
    expect(screen.getByRole('link', { name: '10' }).getAttribute('aria-current')).toBe('page')
    expect(screen.queryByRole('link', { name: 'Go to next page' })).toBeNull()
  })

  it('uses Arabic labels and logical RTL chevrons', () => {
    render(<Pagination currentPage={5} totalPages={10} basePath="/news" locale="ar" />)

    const navigation = screen.getByRole('navigation', { name: 'ترقيم الصفحات' })
    const previous = within(navigation).getByRole('link', { name: 'الصفحة السابقة' })
    const next = within(navigation).getByRole('link', { name: 'الصفحة التالية' })

    expect(within(previous).getByText('السابق').className).toContain('hidden sm:inline')
    expect(within(next).getByText('التالي').className).toContain('hidden sm:inline')
    expect(previous.innerHTML).toContain('lucide-chevron-right')
    expect(next.innerHTML).toContain('lucide-chevron-left')
  })

  it('provides compact wrapping semantics and accessible 44px targets', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        basePath="/blog"
        locale="en"
        className="min-w-max justify-start"
      />,
    )

    const navigation = screen.getByRole('navigation', { name: 'Pagination' })
    const list = within(navigation).getByRole('list')

    expect(navigation.className).toContain('min-w-0')
    expect(navigation.className).not.toContain('min-w-max')
    expect(list.className).toContain('max-w-[390px]')
    expect(list.className).toContain('flex-wrap')
    expect(list.className).toContain('sm:flex-nowrap')

    for (const target of within(navigation).getAllByRole('link')) {
      expect(target.className).toContain('min-h-11')
      expect(target.className).toContain('min-w-11')
      expect(target.className).toContain('focus-visible:ring-2')
    }
  })
})
