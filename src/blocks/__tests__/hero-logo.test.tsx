import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  heroSection: vi.fn((_props: Record<string, unknown>) => null),
  getPublicSiteSettings: vi.fn(),
}))

vi.mock('@/components/sections/HeroSection', () => ({
  HeroSection: mocks.heroSection,
}))

vi.mock('@/lib/payload/get-public-site-settings', () => ({
  getPublicSiteSettings: mocks.getPublicSiteSettings,
}))

import { render } from '@testing-library/react'

import { RenderBlocks } from '@/blocks/RenderBlocks'

describe('RenderBlocks hero logo wiring', () => {
  it('passes the Site Settings logo into the hero and keeps it optional', async () => {
    const logo = { url: '/api/media/file/logo.svg', alt: 'شعار', mimeType: 'image/svg+xml' }
    mocks.getPublicSiteSettings.mockResolvedValue({ siteName: 'AAU', socialLinks: [], logo })

    render(
      await RenderBlocks({
        blocks: [{ blockType: 'hero', id: 'h1' }] as never,
        locale: 'ar',
      }),
    )

    expect(mocks.getPublicSiteSettings).toHaveBeenCalledWith('ar')
    expect(mocks.heroSection.mock.calls[0]?.[0]).toMatchObject({ logo })
  })

  it('passes undefined when the CMS has no logo so the bundled asset is used', async () => {
    mocks.heroSection.mockClear()
    mocks.getPublicSiteSettings.mockResolvedValue({ siteName: 'AAU', socialLinks: [] })

    render(
      await RenderBlocks({
        blocks: [{ blockType: 'hero', id: 'h1' }] as never,
        locale: 'en',
      }),
    )

    expect(mocks.heroSection.mock.calls[0]?.[0].logo).toBeUndefined()
  })
})
