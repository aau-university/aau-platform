import { describe, expect, it } from 'vitest'

import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * Smoke test for {@link getMediaUrl}. Asserts a populated media doc
 * produces an absolute URL with a `?v=<updatedAt>` cache-bust param.
 */
describe('getMediaUrl()', () => {
  it('appends a cache-bust query from updatedAt', () => {
    const url = getMediaUrl({
      url: '/api/media/file/image.webp',
      updatedAt: '2025-01-01T00:00:00.000Z',
      filename: 'image.webp',
    })

    expect(url).toContain('/api/media/file/image.webp')
    expect(url).toContain('?v=2025-01-01T00%3A00%3A00.000Z')
  })
})
