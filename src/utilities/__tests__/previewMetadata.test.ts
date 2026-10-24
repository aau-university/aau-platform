import { describe, expect, it } from 'vitest'

import { asPreviewMetadata } from '../previewMetadata'

describe('asPreviewMetadata', () => {
  it('keeps published metadata unchanged', () => {
    const metadata = { alternates: { canonical: '/news/item' }, title: 'Item' }
    expect(asPreviewMetadata(metadata, false)).toBe(metadata)
  })

  it('removes canonical URLs and prevents indexing for a draft', () => {
    const result = asPreviewMetadata(
      {
        alternates: { canonical: '/news/item' },
        openGraph: { title: 'Draft', url: '/news/item' },
      },
      true,
    )

    expect(result.alternates).toBeUndefined()
    expect(result.openGraph).toMatchObject({ title: 'Draft', url: undefined })
    expect(result.robots).toMatchObject({ index: false, follow: false })
  })
})
