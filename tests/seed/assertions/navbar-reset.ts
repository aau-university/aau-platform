import { expect } from 'vitest'
import type { Payload } from 'payload'

import { navbarSettingsFixture } from '@/seed/fixtures/globals'
import { expectFixtureLeaves } from './fixture-match'

export async function corruptNavbarForReset(payload: Payload) {
  const [navbar, pages] = await Promise.all([
    readNavbar(payload),
    payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      fallbackLocale: false,
      limit: 0,
      locale: 'ar',
      overrideAccess: true,
      pagination: false,
    }),
  ])
  const home = pages.docs.find(({ slug }) => slug === 'home')
  if (!home) throw new Error('Missing Home dependency for Navbar corruption.')
  const callToAction = {
    appearance: 'ghost' as const,
    newTab: true,
    reference: { relationTo: 'pages' as const, value: home.id },
    type: 'reference' as const,
  }

  await payload.updateGlobal({
    slug: 'navbar-settings',
    context: { disableRevalidate: true },
    data: {
      callToAction,
      hideLogin: true,
      showLanguagePicker: false,
    },
    overrideAccess: true,
  })

  return { id: navbar.id }
}

export async function assertNavbarReset(
  payload: Payload,
  expected: Awaited<ReturnType<typeof corruptNavbarForReset>>,
): Promise<void> {
  const navbar = await readNavbar(payload)
  expect(navbar.id).toBe(expected.id)
  expectFixtureLeaves(navbar, navbarSettingsFixture.shared, 'reset.navbar')
  expect(navbar.callToAction?.reference ?? null).toBeNull()
  expect(navbar.callToAction).toMatchObject({
    appearance: 'default',
    newTab: false,
    type: 'custom',
    url: '/admission',
  })
  expect(navbar.topBarItems).toEqual([])
  expect(navbar.hideLogin).toBe(false)
  expect(navbar.showLanguagePicker).toBe(true)
}

function readNavbar(payload: Payload) {
  return payload.findGlobal({
    slug: 'navbar-settings',
    depth: 0,
    fallbackLocale: false,
    overrideAccess: true,
  })
}
