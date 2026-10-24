import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import { MainLayout } from '@/components/site/MainLayout'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import type { PublicFooterSettings } from '@/lib/payload/get-public-footer-settings'
import type { PublicNavbarSettings } from '@/lib/payload/get-public-navbar-settings'
import type { PublicSiteSettings } from '@/lib/payload/get-public-site-settings'
import type { PublicNavItem } from '@/lib/site/public-routes'

vi.mock('next/navigation', () => ({
  usePathname: () => '/about',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

const settings: PublicSiteSettings = {
  siteName: 'AAU',
  tagline: 'Learn',
  description: 'University',
  socialLinks: [],
}

const navbarSettings: PublicNavbarSettings = {
  topBarItems: [],
  hideLogin: false,
  showLanguagePicker: false,
  callToAction: null,
}

const nav: PublicNavItem[] = [
  {
    key: 'colleges',
    label: 'Colleges',
    href: '/colleges',
    inMainNav: true,
    children: [
      {
        key: 'engineering',
        label: 'Engineering',
        href: '/colleges/engineering',
        openInNewTab: false,
      },
    ],
  },
  {
    key: 'campus-life',
    label: 'Campus Life',
    href: '/campus-life',
    inMainNav: true,
    children: [
      {
        key: 'student-clubs',
        label: 'Student Clubs',
        href: '/campus-life/student-clubs',
        openInNewTab: false,
      },
    ],
  },
  {
    key: 'about',
    label: 'About',
    href: '/about',
    inMainNav: true,
  },
  {
    key: 'research',
    label: 'Research',
    href: '/research',
    inMainNav: true,
    showInMore: true,
  },
]

function renderHeader(overrides?: {
  settings?: PublicSiteSettings
  navbarSettings?: PublicNavbarSettings
}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <SiteHeader
        nav={nav}
        settings={overrides?.settings ?? settings}
        navbarSettings={overrides?.navbarSettings ?? navbarSettings}
      />
    </LanguageProvider>,
  )
}

describe('public shell accessibility', () => {
  it('renders a navigable parent link and a distinct focusable disclosure', () => {
    renderHeader()
    const parentLinks = screen.getAllByRole('link', { name: 'Colleges' })
    const trigger = screen.getByRole('button', { name: 'Colleges menu' })

    expect(parentLinks.some((link) => link.getAttribute('href') === '/colleges')).toBe(true)
    expect(trigger.tabIndex).toBe(0)
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
  })

  it('opens with Enter, closes immediately with Escape and restores disclosure focus', () => {
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Colleges menu' })

    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Engineering')).toBeTruthy()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('toggles a real Campus Life NavItem with Space activation', () => {
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Campus Life menu' })

    fireEvent.keyDown(trigger, { key: ' ' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Student Clubs')).toBeTruthy()

    fireEvent.keyDown(trigger, { key: ' ' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('preserves hover opening on the parent navigation link', () => {
    renderHeader()
    const desktopParent = screen
      .getAllByRole('link', { name: 'Colleges' })
      .find((link) => link.className.includes('xl:text-base'))
    const trigger = screen.getByRole('button', { name: 'Colleges menu' })

    fireEvent.mouseEnter(desktopParent!)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Engineering')).toBeTruthy()

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes a desktop dropdown on an outside pointer', () => {
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Colleges menu' })

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.pointerDown(document.body)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBeNull()
  })

  it('opens the desktop More menu by click and exposes its controlled panel', () => {
    renderHeader()
    const trigger = screen
      .getAllByRole('button', { name: 'More' })
      .find((button) => !button.getAttribute('aria-controls')?.endsWith('-mobile'))

    expect(trigger).toBeDefined()
    fireEvent.click(trigger!)
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(trigger!.getAttribute('aria-controls')!)).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'Research' }).length).toBeGreaterThan(0)

    fireEvent.click(trigger!)
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the desktop More menu on an outside pointer', () => {
    renderHeader()
    const trigger = screen
      .getAllByRole('button', { name: 'More' })
      .find((button) => !button.getAttribute('aria-controls')?.endsWith('-mobile'))

    fireEvent.click(trigger!)
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    fireEvent.pointerDown(document.body)
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
  })

  it('toggles the desktop More disclosure with Enter and Space', () => {
    renderHeader()
    const trigger = screen
      .getAllByRole('button', { name: 'More' })
      .find((button) => !button.getAttribute('aria-controls')?.endsWith('-mobile'))

    fireEvent.keyDown(trigger!, { key: 'Enter' })
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(trigger!, { key: ' ' })
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
  })

  it('contains mobile focus, closes on Escape, restores focus and body overflow', async () => {
    document.body.style.overflow = 'clip'
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Open menu' })

    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Navigation menu' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.contains(trigger)).toBe(true)
    expect(trigger.hasAttribute('data-mobile-focus')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)
    await waitFor(() => expect(document.activeElement).toBe(panel?.querySelector('[data-mobile-focus]')))
    const trapped = Array.from(dialog.querySelectorAll<HTMLElement>('[data-mobile-focus]'))
    trapped.at(-1)?.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(trigger)

    act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    await waitFor(() => expect(document.body.style.overflow).toBe('clip'))
    document.body.style.overflow = ''
  })

  it('closes the mobile menu from its backdrop and restores focus', async () => {
    renderHeader()
    const trigger = screen.getByRole('button', { name: 'Open menu' })

    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByTestId('mobile-menu-backdrop'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('gives topbar links 44px hit targets without changing the compact row', () => {
    const { container } = renderHeader({
      navbarSettings: {
        ...navbarSettings,
        topBarItems: [{ label: 'Portal', href: '/portal', newTab: false }],
      },
    })

    const portal = screen.getByRole('link', { name: 'Portal' })
    expect(portal.className).toContain('min-h-11')
    expect(portal.className).toContain('-my-1')
    expect(container.querySelector('.h-9')).not.toBeNull()
  })

  it('renders a CMS logo with stable dimensions and falls back to the icon', () => {
    const { unmount } = renderHeader({
      settings: {
        ...settings,
        logo: { url: '/media/aau-logo.png', alt: 'AAU crest', width: 120, height: 120 },
      },
    })
    const logo = screen.getByAltText('AAU crest')
    expect(logo.getAttribute('width')).toBe('120')
    expect(logo.getAttribute('height')).toBe('120')

    unmount()
    renderHeader()
    expect(screen.getByTestId('site-logo-fallback')).toBeTruthy()
  })

  it('bypasses image optimization for uploaded SVG and remote object-storage logos', () => {
    const { unmount } = renderHeader({
      settings: {
        ...settings,
        logo: { url: '/media/aau-logo.svg', alt: 'SVG crest', mimeType: 'image/svg+xml' },
      },
    })
    expect(screen.getByAltText('SVG crest').getAttribute('src')).toBe('/media/aau-logo.svg')

    unmount()
    renderHeader({
      settings: {
        ...settings,
        logo: {
          url: 'https://assets.example.r2.cloudflarestorage.com/aau-logo.png',
          alt: 'R2 crest',
          mimeType: 'image/png',
        },
      },
    })
    expect(screen.getByAltText('R2 crest').getAttribute('src')).toBe(
      'https://assets.example.r2.cloudflarestorage.com/aau-logo.png',
    )
  })

  it('exposes the optional topbar offset contract to MainLayout', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="en">
        <SiteHeader nav={nav} settings={settings} navbarSettings={navbarSettings} />
        <MainLayout>Page</MainLayout>
      </LanguageProvider>,
    )

    expect(container.querySelector('header')?.className).toContain(
      'sm:[&+.site-main]:[--site-header-offset:7.25rem]',
    )
    expect(container.querySelector('main')?.className).toContain('site-main')
    expect(container.querySelector('main')?.className).toContain(
      'pt-[var(--site-header-offset,5rem)]',
    )
  })
})

const footerSettings: PublicFooterSettings = {
  footerItems: ['One', 'Two', 'Three', 'Four'].map((group, index) => ({
    label: `${group} link`,
    href: `/group-${index + 1}`,
    newTab: false,
    group,
  })),
  footerBackgroundType: 'none',
  footerBackgroundImage: null,
  footerBackgroundVideo: null,
  footerBackgroundOverlayOpacity: 0.65,
  hideFooterSignup: true,
  address: null,
  footerPowered: null,
}

describe('<SiteFooter />', () => {
  it('preserves every CMS footer group', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <SiteFooter nav={nav} settings={settings} footerSettings={footerSettings} />
      </LanguageProvider>,
    )

    for (const group of ['One', 'Two', 'Three', 'Four']) {
      expect(screen.getByRole('heading', { name: group, level: 2 })).toBeTruthy()
    }
    expect(screen.getByRole('heading', { name: 'AAU', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Contact', level: 2 })).toBeTruthy()
  })
})
