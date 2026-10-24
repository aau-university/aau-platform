import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  admissionForm: vi.fn(),
  getPayload: vi.fn(),
  getProgramOptionsByColleges: vi.fn(),
  getPublicCollegesList: vi.fn(),
  getPublicStudentAffairsDocuments: vi.fn(),
}))

vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/lib/payload/get-public-colleges', () => ({
  getPublicCollegesList: mocks.getPublicCollegesList,
}))
vi.mock('@/lib/payload/get-public-programs', () => ({
  getProgramOptionsByColleges: mocks.getProgramOptionsByColleges,
}))
vi.mock('@/lib/payload/get-public-student-affairs-documents', () => ({
  getPublicStudentAffairsDocuments: mocks.getPublicStudentAffairsDocuments,
}))
vi.mock('@/components/pages/admission', () => ({
  AdmissionForm: (props: unknown) => {
    mocks.admissionForm(props)
    return <div data-testid="admission-form" />
  },
}))

import { AdmissionContent } from '../page'

afterEach(cleanup)

describe('AdmissionContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPublicCollegesList.mockResolvedValue([
      { id: '101', slug: 'engineering', name: 'Engineering' },
    ])
    mocks.getProgramOptionsByColleges.mockResolvedValue({
      '101': [{ id: 201, slug: 'software', name: 'Software Engineering' }],
    })
    mocks.getPublicStudentAffairsDocuments.mockResolvedValue([
      { id: '301', title: 'Regulations', fileComingSoon: false, downloadUrl: '/download' },
    ])
  })

  it('loads admission-owned data without querying plugin Forms', async () => {
    render(await AdmissionContent({ locale: 'en' }))

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Admission & Registration' })).toBeTruthy()
    expect(screen.getByTestId('admission-form')).toBeTruthy()
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.getPublicCollegesList).toHaveBeenCalledWith({ locale: 'en', limit: 50 })
    // One batched call for ALL colleges (the N+1 per-college pattern is gone).
    expect(mocks.getProgramOptionsByColleges).toHaveBeenCalledTimes(1)
    expect(mocks.getProgramOptionsByColleges).toHaveBeenCalledWith(['101'], 'en')
    expect(mocks.getPublicStudentAffairsDocuments).toHaveBeenCalledWith({ locale: 'en' })

    const props = mocks.admissionForm.mock.calls[0]?.[0]
    expect(props).not.toHaveProperty('formConfig')
    expect(props).toMatchObject({
      locale: 'en',
      studentAffairsDocs: [
        { id: '301', title: 'Regulations', fileComingSoon: false, downloadUrl: '/download' },
      ],
      colleges: [
        {
          id: 101,
          slug: 'engineering',
          name: 'Engineering',
          programs: [{ id: 201, slug: 'software', name: 'Software Engineering' }],
        },
      ],
    })
  })

  it('renders the localized Arabic page heading', async () => {
    render(await AdmissionContent({ locale: 'ar' }))

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'القبول والتسجيل' })).toBeTruthy()
  })
})
