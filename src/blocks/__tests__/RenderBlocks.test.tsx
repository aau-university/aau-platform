import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import type { PageLayoutBlock } from '@/blocks/types'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import type { User } from '@/payload-types'

const { newsSectionProps } = vi.hoisted(() => ({ newsSectionProps: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/payload/get-public-colleges', () => ({
  getPublicColleges: vi.fn(async () => [
    {
      id: '1',
      slug: 'engineering',
      name: 'Engineering',
      description: 'Description',
      programsCount: 4,
      facultyCount: 50,
    },
  ]),
}))

vi.mock('@/lib/payload/get-public-news', () => ({
  getPublicNews: vi.fn(async () => [
    {
      id: '1',
      slug: 'admissions',
      title: 'Admissions News',
      summary: 'Summary',
      publishDate: '2026-01-01',
    },
  ]),
}))

vi.mock('@/lib/payload/get-public-contact-settings', () => ({
  getPublicContactSettings: vi.fn(async () => ({
    siteName: 'University',
    socialLinks: [],
    contactPhone: '+967 1 234 567',
    contactEmail: 'info@example.edu',
  })),
}))

vi.mock('@/lib/payload/get-public-site-settings', () => ({
  getPublicSiteSettings: vi.fn(async () => ({
    siteName: 'University',
    socialLinks: [],
  })),
}))

vi.mock('@/lib/payload/get-public-events', () => ({
  getPublicEvents: vi.fn(async () => [
    {
      id: '1',
      title: 'Annual Science Fair',
      slug: 'science-fair',
      description: 'A science fair event',
      eventDate: '2026-03-15',
      location: 'Main Campus',
      organizer: 'Faculty of Science',
      image: null,
    },
  ]),
}))

vi.mock('@/lib/payload/get-public-blog-posts', () => ({
  getPublicBlogPosts: vi.fn(async () => [
    {
      id: '1',
      title: 'University Research Update',
      slug: 'research-update',
      excerpt: 'Latest research findings',
      authorName: 'Dr. Ahmed',
      category: 'Research',
      publishedAt: '2026-02-01',
      readTime: 5,
      image: null,
      tags: 'research,science',
    },
  ]),
}))

vi.mock('@/lib/payload/get-public-faqs', () => ({
  getPublicFAQs: vi.fn(async () => [
    {
      id: '1',
      question: 'What programs are offered?',
      answer: 'We offer many programs.',
      category: 'Admissions',
      displayOrder: 0,
    },
  ]),
}))

vi.mock('@/lib/payload/get-public-team-members', () => ({
  getPublicTeamMembers: vi.fn(async () => [
    {
      id: '1',
      name: 'Prof. Ali Hassan',
      jobTitle: 'Dean of Engineering',
      group: 'Leadership',
      image: null,
      displayOrder: 0,
    },
  ]),
}))

vi.mock('@/blocks/CollegesGridBlock/Component', () => ({
  CollegesSection: () => <div>Engineering</div>,
}))

vi.mock('@/blocks/NewsGridBlock/Component', () => ({
  NewsSection: (props: unknown) => {
    newsSectionProps(props)
    return <div>Admissions News</div>
  },
}))

vi.mock('@/blocks/ContactInfoBlock/Component', () => ({
  ContactCTASection: () => <div>+967 1 234 567</div>,
}))

vi.mock('@/blocks/EventsGridBlock/Component', () => ({
  EventsGridSection_Server: () => <div>Annual Science Fair</div>,
}))

vi.mock('@/blocks/BlogGridBlock/Component', () => ({
  BlogGridBlock_Server: () => <div>University Research Update</div>,
}))

vi.mock('@/blocks/FAQBlock/Component', () => ({
  FAQBlock_Server: () => <div>What programs are offered?</div>,
}))

vi.mock('@/blocks/TeamMembersBlock/Component', () => ({
  TeamMembersSection: () => <div>Prof. Ali Hassan</div>,
}))

async function renderBlocks(blocks: PageLayoutBlock[], language: 'ar' | 'en' = 'ar') {
  const node = await RenderBlocks({ blocks })
  return render(<LanguageProvider initialLanguage={language}>{node}</LanguageProvider>)
}

describe('RenderBlocks', () => {
  it('derives page layout block types from generated Payload types', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(path.resolve(testDir, '../../blocks/types.ts'), 'utf8')

    expect(source).toContain("import type { Page } from '@/payload-types'")
    expect(source).toContain("NonNullable<Page['layout']>[number]")
    expect(source).not.toContain("@/components/home/")
  })

  it('renders hero, stats, and CTA blocks', async () => {
    const { container } = await renderBlocks([
      {
        blockType: 'hero',
        titlePrimary: 'جامعة الجيل الجديد',
      },
      {
        blockType: 'stats',
        items: [
          { key: 'students', icon: 'students', number: '+10', label: 'طلاب' },
        ],
      },
      {
        blockType: 'admissionCTA',
        heading: 'انضم إلى مجتمع الأكاديمية',
      },
    ])
    const text = container.textContent ?? ''
    expect(text).toContain('جامعة الجيل الجديد')
    expect(text).toContain('+10')
    expect(text).toContain('انضم إلى مجتمع الأكاديمية')
  })

  it('renders dynamic colleges, news, and contact blocks through public loaders', async () => {
    const { container } = await renderBlocks([
      { blockType: 'collegesGrid', maxItems: 1 },
      { blockType: 'newsGrid', maxItems: 1 },
      { blockType: 'contactInfo' },
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('Engineering')
    expect(text).toContain('Admissions News')
    expect(text).toContain('+967 1 234 567')
  })

  it('propagates the authenticated draft read context to data-fetching blocks', async () => {
    const user = { id: 17, isActive: true, roleIsActive: true } as User
    const node = await RenderBlocks({
      blocks: [{ blockType: 'newsGrid', maxItems: 1 } as PageLayoutBlock],
      readContext: { draft: true, user },
    })
    render(<LanguageProvider initialLanguage="en">{node}</LanguageProvider>)

    expect(newsSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ readContext: { draft: true, user } }),
    )
  })

  it('renders eventsGrid block through getPublicEvents loader', async () => {
    const { container } = await renderBlocks([
      { blockType: 'eventsGrid', maxItems: 2 } as PageLayoutBlock,
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('Annual Science Fair')
  })

  it('renders blogGrid block through getPublicBlogPosts loader', async () => {
    const { container } = await renderBlocks([
      { blockType: 'blogGrid', maxItems: 2 } as PageLayoutBlock,
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('University Research Update')
  })

  it('renders faq block through getPublicFAQs loader', async () => {
    const { container } = await renderBlocks([
      { blockType: 'faq', maxItems: 5 } as PageLayoutBlock,
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('What programs are offered?')
  })

  it('renders teamMembers block through getPublicTeamMembers loader', async () => {
    const { container } = await renderBlocks([
      { blockType: 'teamMembers', maxItems: 4 } as PageLayoutBlock,
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('Prof. Ali Hassan')
  })

  it('renders partners block from inline JSON (no loader needed)', async () => {
    const { container } = await renderBlocks([
      {
        blockType: 'partners',
        partners: [
          { id: '1', name: 'ACME Corp', website: 'https://acme.com' },
        ],
      } as unknown as PageLayoutBlock,
    ], 'en')
    const text = container.textContent ?? ''
    expect(text).toContain('ACME Corp')
  })

  it('ignores unknown block types safely', async () => {
    const { container } = await renderBlocks([
      { blockType: 'unknown', title: 'Do not render' } as unknown as PageLayoutBlock,
      {
        blockType: 'stats',
        items: [{ key: 'students', icon: 'students', number: '5,000', label: 'Students' }],
      },
    ])
    const text = container.textContent ?? ''
    expect(text).not.toContain('Do not render')
    expect(text).toContain('5,000')
  })

  it('renders nothing for a stats block without items (no invented fallback numbers)', async () => {
    const { container } = await renderBlocks([{ blockType: 'stats', items: [] }])
    expect(container.textContent ?? '').toBe('')
  })
})
