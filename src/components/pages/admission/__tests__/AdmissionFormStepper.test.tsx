import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AdmissionFormStepper } from '../AdmissionFormStepper'

describe('<AdmissionFormStepper />', () => {
  it('exposes ordered steps, current step, and numeric progress', () => {
    render(<AdmissionFormStepper step={2} locale="en" />)

    expect(screen.getByRole('list').querySelectorAll(':scope > li:not([aria-hidden="true"])')).toHaveLength(4)
    expect(screen.getByText('Academic').closest('li')?.getAttribute('aria-current')).toBe('step')

    const progress = screen.getByRole('progressbar', { name: 'Application progress' })
    expect(progress.getAttribute('aria-valuenow')).toBe('2')
    expect(progress.getAttribute('aria-valuetext')).toBe('Step 2 of 4')
  })
})
