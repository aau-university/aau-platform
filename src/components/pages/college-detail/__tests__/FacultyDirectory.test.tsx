import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import { FacultyDirectory } from '../FacultyDirectory'

afterEach(cleanup)

describe('<FacultyDirectory /> accessibility', () => {
  it('labels both filters and announces an empty result', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <FacultyDirectory collegeName="Engineering" faculty={[]} departments={[]} />
      </LanguageProvider>,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Faculty Directory - Engineering' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Search by name or academic title' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Academic department' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('No results found')
  })

  it('renders one localized Arabic directory heading', () => {
    render(
      <LanguageProvider initialLanguage="ar">
        <FacultyDirectory collegeName="الهندسة" faculty={[]} departments={[]} />
      </LanguageProvider>,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'دليل أعضاء هيئة التدريس - الهندسة' }),
    ).toBeTruthy()
  })
})
