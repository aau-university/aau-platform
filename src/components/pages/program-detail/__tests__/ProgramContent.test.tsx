import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { AcademicProgram } from '@/payload-types'
import { ProgramContent } from '../ProgramContent'

describe('<ProgramContent /> landmarks', () => {
  it('uses article content without adding a nested main landmark', () => {
    render(<ProgramContent program={{} as AcademicProgram} locale="en" />)

    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.getByRole('article')).toBeTruthy()
  })
})
