import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudentAffairsDocs } from '../StudentAffairsDocs'
import { LanguageProvider } from '@/i18n/LanguageProvider'

function renderDocs(locale: 'ar' | 'en', docs: Parameters<typeof StudentAffairsDocs>[0]['docs']) {
  return render(
    <LanguageProvider initialLanguage={locale}>
      <StudentAffairsDocs docs={docs} locale={locale} />
    </LanguageProvider>,
  )
}

describe('<StudentAffairsDocs />', () => {
  it('renders an honest Arabic empty state without fabricated documents', () => {
    renderDocs('ar', [])

    expect(screen.getByText('لا توجد مستندات منشورة حالياً.')).toBeTruthy()
    expect(screen.queryByText('لائحة شؤون الطلاب')).toBeNull()
    expect(screen.queryByText('استمارة تظلمات')).toBeNull()
  })

  it('renders an honest English empty state without fabricated documents', () => {
    renderDocs('en', [])

    expect(screen.getByText('No documents are currently published.')).toBeTruthy()
    expect(screen.queryByText('Student Affairs Regulations')).toBeNull()
    expect(screen.queryByText('Grievance Form')).toBeNull()
  })

  it('renders only the public endpoint URL for a downloadable document', () => {
    const { container } = renderDocs('en', [
      {
        id: '7',
        title: 'Student Regulations',
        fileComingSoon: false,
        downloadUrl: '/api/public/student-affairs-documents/7/download',
      },
    ])

    const link = screen.getByRole('link', { name: /Student Regulations/i })
    expect(link.getAttribute('href')).toBe('/api/public/student-affairs-documents/7/download')
    expect(container.innerHTML).not.toContain('private-media')
  })
})
