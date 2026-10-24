import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContactForm, type ContactFormLabels } from '../ContactForm.client'

const labels: ContactFormLabels = {
  name: 'Name',
  namePlaceholder: 'Enter name',
  email: 'Email',
  emailPlaceholder: 'Enter email',
  phone: 'Phone',
  phonePlaceholder: 'Optional phone',
  subject: 'Subject',
  subjectPlaceholder: 'Enter subject',
  message: 'Message',
  messagePlaceholder: 'Enter message',
  submit: 'Send Message',
}

afterEach(() => vi.unstubAllGlobals())

describe('<ContactForm /> success state', () => {
  it('announces success and moves focus to the status panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<ContactForm labels={labels} info={{}} locale="en" />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Ada Example' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), { target: { value: 'Admissions' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Please send more details.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }))

    const status = await screen.findByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toContain('Message Sent')
    await waitFor(() => expect(document.activeElement).toBe(status))
  })
})
