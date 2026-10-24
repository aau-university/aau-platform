import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EmailRequestSuccessPanel } from '../EmailRequestForm.client'

describe('<EmailRequestForm /> success state', () => {
  it('announces success and moves focus to the status panel', async () => {
    render(
      <EmailRequestSuccessPanel
        title="Request Submitted"
        message="Student Affairs will review your request."
        onReset={vi.fn()}
        resetLabel="Submit a new request"
      />,
    )

    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toContain('Request Submitted')
    await waitFor(() => expect(document.activeElement).toBe(status))
  })
})
