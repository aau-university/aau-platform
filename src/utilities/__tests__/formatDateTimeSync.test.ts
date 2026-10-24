import { describe, expect, it } from 'vitest'

import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'

describe('formatDateTimeSync', () => {
  it('keeps the UTC calendar day stable for an ISO timestamp', () => {
    const timestamp = '2026-07-17T00:30:00.000Z'

    expect(formatDateTimeSync(timestamp, 'en')).toBe('July 17, 2026')
  })

  it('preserves locale-aware Arabic presentation', () => {
    const formatted = formatDateTimeSync('2026-07-17T23:30:00.000Z', 'ar')

    expect(formatted).toBe('17 \u064a\u0648\u0644\u064a\u0648 2026')
  })

  it('uses the UTC day when an offset crosses forward into the next day', () => {
    expect(formatDateTimeSync('2026-07-17T23:30:00-02:00', 'en')).toBe('July 18, 2026')
  })

  it('uses the UTC day when an offset crosses backward into the previous day', () => {
    expect(formatDateTimeSync('2026-07-17T00:30:00+02:00', 'en')).toBe('July 16, 2026')
  })

  it('preserves date-only stored calendar values', () => {
    expect(formatDateTimeSync('2026-07-17', 'en')).toBe('July 17, 2026')
  })

  it('returns an empty string for absent or invalid values', () => {
    expect(formatDateTimeSync(null, 'en')).toBe('')
    expect(formatDateTimeSync('not-a-date', 'en')).toBe('')
  })
})
