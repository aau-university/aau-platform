import type { Locale } from '@/i18n/locale'
import type { SiteSetting } from '@/payload-types'

import { applyPublicCacheTags, collectionCacheTag, globalCacheTag } from './cache-tags'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'

/**
 * Public-facing slice of the `site-settings` global.
 *
 * Only the fields the public site actually renders. We deliberately do NOT
 * forward fields like analytics IDs or sensitive payloads.
 */
/** Public slice of an uploaded media document (e.g. the site logo). */
export interface PublicSiteLogo {
  url: string
  alt?: string
  width?: number
  height?: number
  mimeType?: string
}

export interface PublicSiteSettings {
  siteName: string
  /** Tagline shown under the logo, if present. */
  tagline?: string
  /** Short description used in the footer + default meta description. */
  description?: string
  /**
   * Editor-uploaded site logo from the `site-settings` global. Undefined when
   * nothing is uploaded — consumers fall back to their bundled asset.
   */
  logo?: PublicSiteLogo
  contactEmail?: string
  contactPhone?: string
  address?: string
  socialLinks: Array<{ platform: string; url: string }>
  copyright?: string
}

const FALLBACK_BY_LOCALE: Record<Locale, PublicSiteSettings> = {
  ar: {
    siteName: 'جامعة الجيل الجديد',
    tagline: 'لأجيال واعدة',
    description:
      'مؤسسة تعليمية رائدة تهدف إلى إعداد خريجين متخصصين ومؤهلين علميًا وتقنيًا للمساهمة في تنمية المجتمع.',
    socialLinks: [],
  },
  en: {
    siteName: 'AJ JEEL ALJADEED UNIVERSITY',
    tagline: 'FOR PROMISING GENERATIONS',
    description:
      'A leading educational institution aiming to prepare specialised, scientifically qualified graduates who contribute to community development.',
    socialLinks: [],
  },
}

function fallbackFor(locale: Locale): PublicSiteSettings {
  return FALLBACK_BY_LOCALE[locale]
}

function asString(value: unknown, fallback?: string): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value
  return fallback
}

/**
 * The `logo` upload relation resolves to a media document at depth 1; an
 * unpopulated relation (plain ID) or a document without a usable `url` maps
 * to undefined so consumers keep their bundled fallback.
 */
function asPublicLogo(value: SiteSetting['logo']): PublicSiteLogo | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (typeof value.url !== 'string' || value.url.trim() === '') return undefined
  return {
    url: value.url,
    alt: asString(value.alt),
    width: typeof value.width === 'number' ? value.width : undefined,
    height: typeof value.height === 'number' ? value.height : undefined,
    mimeType: asString(value.mimeType),
  }
}

export async function getPublicSiteSettings(locale: Locale = 'ar'): Promise<PublicSiteSettings> {
  const fallback = fallbackFor(locale)

  try {
    return await getPublicSiteSettingsStrict(locale, fallback)
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[getPublicSiteSettings] read failed; using fallback.', err)
    }
    return fallback
  }
}

async function getPublicSiteSettingsStrict(
  locale: Locale,
  fallback: PublicSiteSettings,
): Promise<PublicSiteSettings> {
  'use cache'

  // The media tag keeps the logo fresh when the referenced file itself is
  // replaced, not only when the global is saved.
  applyPublicCacheTags(globalCacheTag('site-settings'), collectionCacheTag('media'))

  const payload = await getPayloadSafe()
  if (!payload) throw new Error('Payload is unavailable.')

  // Depth 1 resolves the `logo` upload relation to its media document.
  const doc = (await payload.findGlobal({
    slug: 'site-settings',
    locale,
    overrideAccess: false,
    depth: 1,
  })) as SiteSetting

  const social: PublicSiteSettings['socialLinks'] = Array.isArray(doc.socialLinks)
    ? doc.socialLinks
        .map((l) => ({
          platform: l.platform,
          url: l.url,
        }))
        .filter((l) => l.platform && l.url)
    : []

  return {
    siteName: asString(doc.siteName, fallback.siteName) ?? fallback.siteName,
    tagline: asString(doc.tagline, fallback.tagline),
    description: asString(doc.description, fallback.description),
    logo: asPublicLogo(doc.logo),
    contactEmail: asString(doc.contactEmail),
    contactPhone: asString(doc.contactPhone),
    address: asString(doc.address),
    socialLinks: social,
    copyright: asString(doc.copyright),
  }
}
