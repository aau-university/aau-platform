import { cookies } from 'next/headers'

import { DEFAULT_LOCALE, LANG_COOKIE, type Locale, isLocale } from '@/i18n/locale'

/**
 * Format a date value into a locale-aware string.
 *
 * Locale resolution order:
 *   1. The `locale` argument, if valid.
 *   2. The `aau_lang` cookie (`LANG_COOKIE`) read via `next/headers`.
 *   3. {@link DEFAULT_LOCALE} (`ar`).
 *
 * Server-only when called without a `locale` argument — `cookies()` is
 * async in Next 15+. Pass a `locale` to keep the call usable from the
 * client (the function remains async for a uniform call signature).
 *
 * Uses `Intl.DateTimeFormat` with a conservative preset
 * (`year-month-day`) so the output is stable across Node and browser ICU
 * builds.
 */
export async function formatDateTime(
  dateValue: string | number | Date | null | undefined,
  locale?: Locale,
): Promise<string> {
  const resolvedLocale = await resolveLocale(locale)

  const date = toDate(dateValue)
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat(resolvedLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    // Fallback to ISO date if ICU doesn't recognise the locale.
    return date.toISOString().slice(0, 10)
  }
}
async function resolveLocale(explicit?: Locale): Promise<Locale> {
  if (explicit && isLocale(explicit)) return explicit

  try {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(LANG_COOKIE)?.value
    if (cookieValue && isLocale(cookieValue)) return cookieValue
  } catch {
    // cookies() throws outside a request scope (e.g. tests, build-time).
    // Fall through to default locale.
  }

  return DEFAULT_LOCALE
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default formatDateTime
