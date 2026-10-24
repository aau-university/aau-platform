import { render, screen } from '@testing-library/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { Form } from '@/components/ui/form'
import { joinRequestSchema } from '@/lib/forms/join-request-schema'
import { AdmissionStepAcademic } from '../AdmissionStepAcademic'
import { AdmissionStepPersonal } from '../AdmissionStepPersonal'

type FormValues = z.input<typeof joinRequestSchema>
type SubmitValues = z.output<typeof joinRequestSchema>

function expectRequired(control: HTMLInputElement | HTMLButtonElement) {
  expect(control.getAttribute('aria-required')).toBe('true')
  expect(control.labels?.[0]?.textContent).toContain('*')
}

function PersonalHarness() {
  const form = useForm<FormValues, unknown, SubmitValues>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { fullName: '', email: '', phone: '', educationStatus: 'graduate' },
  })

  return (
    <Form {...form}>
      <AdmissionStepPersonal form={form} locale="en" />
    </Form>
  )
}

function AcademicHarness() {
  const form = useForm<FormValues, unknown, SubmitValues>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { desiredCollege: 1 },
  })

  return (
    <Form {...form}>
      <AdmissionStepAcademic
        form={form}
        locale="en"
        colleges={[
          {
            id: 1,
            slug: 'engineering',
            name: 'Engineering',
            programs: [{ id: 2, slug: 'software', name: 'Software Engineering' }],
          },
        ]}
      />
    </Form>
  )
}

describe('admission required field semantics', () => {
  it('marks every required personal control visibly and programmatically', () => {
    render(<PersonalHarness />)

    expectRequired(screen.getByRole('textbox', { name: 'Full Name' }) as HTMLInputElement)
    expectRequired(screen.getByRole('textbox', { name: 'Email Address' }) as HTMLInputElement)
    expectRequired(screen.getByRole('textbox', { name: 'Phone Number' }) as HTMLInputElement)
    expectRequired(screen.getByRole('combobox', { name: 'Gender' }) as HTMLButtonElement)

    const educationStatus = screen.getByRole('radiogroup', { name: 'Education Status' })
    expect(educationStatus.getAttribute('aria-required')).toBe('true')
    expect(screen.getByText(/Education Status/, { selector: 'label' }).textContent).toContain('*')

    for (const radio of screen.getAllByRole('radio')) {
      const label = (radio as HTMLButtonElement).labels?.[0]
      expect(label?.classList.contains('min-h-11')).toBe(true)
      expect(label?.classList.contains('touch-manipulation')).toBe(true)
      expect(label?.parentElement?.classList.contains('min-h-11')).toBe(true)
    }
  })

  it('marks every required academic control visibly and programmatically', () => {
    render(<AcademicHarness />)

    expectRequired(screen.getByRole('combobox', { name: 'College' }) as HTMLButtonElement)
    expectRequired(screen.getByRole('combobox', { name: 'Academic Program' }) as HTMLButtonElement)
    expectRequired(screen.getByRole('textbox', { name: 'High School Branch' }) as HTMLInputElement)
    expectRequired(screen.getByRole('spinbutton', { name: 'High School GPA (%)' }) as HTMLInputElement)
  })
})
