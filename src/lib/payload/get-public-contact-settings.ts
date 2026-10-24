import type { PublicSiteSettings } from './get-public-site-settings'
import type { Locale } from '@/i18n/locale'
import type { ContactSetting } from '@/payload-types'
import { applyPublicCacheTags, globalCacheTag } from './cache-tags'
import { getPublicSiteSettings } from './get-public-site-settings'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

interface ContactOverrides {
  phone?: string
  email?: string
  address?: string
}

/**
 * Cached fetch of the `contact-settings` global, keyed by locale only.
 *
 * Kept separate from the site-settings merge so (a) the two globals are
 * fetched in parallel instead of the old sequential await chain, and (b) the
 * `'use cache'` key is a plain locale string rather than a serialized
 * site-settings object.
 */
async function getContactOverrides(locale: Locale): Promise<ContactOverrides> {
  'use cache'

  applyPublicCacheTags(globalCacheTag('contact-settings'))

  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  const doc = (await payload.findGlobal({
    slug: 'contact-settings',
    locale,
    overrideAccess: false,
    depth: 0,
  })) as ContactSetting

  const info = doc.contactInfo
  return {
    phone: asString(info?.phone),
    email: asString(info?.email),
    address: asString(info?.address),
  }
}

export async function getPublicContactSettings(locale: Locale = 'ar'): Promise<PublicSiteSettings> {
  // Both globals are independent — fetch them concurrently. A contact-global
  // failure degrades to plain site settings (the pre-existing behaviour).
  const [siteSettings, overridesResult] = await Promise.all([
    getPublicSiteSettings(locale),
    getContactOverrides(locale).then(
      (overrides) => ({ overrides, err: undefined }),
      (err: unknown) => ({ overrides: undefined, err }),
    ),
  ])

  const overrides = overridesResult.overrides
  if (overrides === undefined) {
    rethrowPayloadErrorInProduction(overridesResult.err)
    return siteSettings
  }
  return {
    ...siteSettings,
    contactPhone: overrides.phone ?? siteSettings.contactPhone,
    contactEmail: overrides.email ?? siteSettings.contactEmail,
    address: overrides.address ?? siteSettings.address,
  }
}
