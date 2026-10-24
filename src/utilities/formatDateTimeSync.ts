import { DEFAULT_LOCALE, type Locale } from '@/i18n/locale'

/**
 * Format a date value into a locale-aware string synchronously.
 * This helper is completely client-safe (contains no next/headers imports).
 */
export function formatDateTimeSync(
  dateValue: string | number | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const date = toDate(dateValue)
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      // Stored calendar dates use UTC so server and browser preserve the same intended day.
      timeZone: 'UTC',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
