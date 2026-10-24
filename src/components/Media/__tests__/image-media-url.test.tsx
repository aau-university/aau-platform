import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ImageMedia } from '../ImageMedia'

/**
 * Regression coverage for the local-VPS media URL contract.
 *
 * Payload is configured with a `serverURL`, so with local storage
 * (`S3_ENABLED=false` — how the VPS runs) an upload's `url` comes back as a
 * SAME-SITE ABSOLUTE URL against the canonical origin. `next/image` treats any
 * absolute URL as remote and only renders it when `images.remotePatterns`
 * authorizes that host; the canonical origin deliberately has no such entry,
 * because it is this site rather than a CDN.
 *
 * The public-page loaders normalize these URLs already. Pages that hand a
 * populated Media document to `<Media>` — the About page's team cards — reach
 * `next/image` through this component instead, so the same normalization has
 * to happen here.
 */
describe('ImageMedia src normalization', () => {
  const ORIGIN = 'https://aau.edu.ye'
  let previousOrigin: string | undefined

  beforeEach(() => {
    previousOrigin = process.env.NEXT_PUBLIC_SERVER_URL
    process.env.NEXT_PUBLIC_SERVER_URL = ORIGIN
  })

  afterEach(() => {
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL
    else process.env.NEXT_PUBLIC_SERVER_URL = previousOrigin
  })

  const mediaDoc = (url: string) =>
    ({
      id: 1,
      url,
      alt: 'Team member',
      mimeType: 'image/jpeg',
      width: 400,
      height: 400,
      filename: 'member.jpg',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  function renderedSrc(url: string): string {
    const { container } = render(<ImageMedia resource={mediaDoc(url)} />)
    return container.querySelector('img')?.getAttribute('src') ?? ''
  }

  it('strips the canonical origin from a same-site absolute local media URL', () => {
    const src = renderedSrc(`${ORIGIN}/api/media/file/member.jpg`)

    // The decisive assertion: the canonical origin must not survive into the
    // URL handed to next/image, in either raw or percent-encoded form.
    expect(src).not.toContain('aau.edu.ye')
    expect(src).not.toContain(encodeURIComponent(ORIGIN))
    // And what remains is the local path `images.localPatterns` whitelists.
    expect(decodeURIComponent(src)).toContain('/api/media/file/member.jpg')
  })

  it('leaves an already-relative media URL unchanged', () => {
    const src = renderedSrc('/api/media/file/member.jpg')
    expect(decodeURIComponent(src)).toContain('/api/media/file/member.jpg')
  })

  it('leaves a genuinely remote S3 URL absolute', () => {
    // A different origin does not match the prefix, so it must stay absolute
    // for `s3RemotePatterns()` to authorize. Stripping it would break S3 mode.
    const src = renderedSrc('https://cdn.example.test/bucket/member.jpg')
    expect(decodeURIComponent(src)).toContain('https://cdn.example.test/bucket/member.jpg')
  })

  it('renders nothing when the media document carries no url', () => {
    const { container } = render(<ImageMedia resource={mediaDoc('')} />)
    expect(container.querySelector('img')).toBeNull()
  })
})
