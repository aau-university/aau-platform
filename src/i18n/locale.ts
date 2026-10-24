/**
 * Locale primitives — shared by server and client.
 *
 * Strategy:
 * - Public site lives at `/` with NO `/ar` or `/en` URL prefix.
 * - Language preference is stored in the `aau_lang` cookie.
 * - Arabic is the default and is RTL.
 * - Payload-owned content uses native `localized: true` fields and is read
 *   with the Payload `locale` option before it reaches client components.
 */

export const LOCALES = ['ar', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type LocalizedText = Record<Locale, string>
export const DEFAULT_LOCALE: Locale = 'ar'

/** Cookie name used by both server (middleware/layout) and client (provider). */
export const LANG_COOKIE = 'aau_lang'

/** Cookie lifetime in seconds (~1 year). */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Backwards-compatible exports kept so existing imports do not break.
export const locales = LOCALES
export const defaultLocale: Locale = DEFAULT_LOCALE

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ar' || value === 'en'
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}
