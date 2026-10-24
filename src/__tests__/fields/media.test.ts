import type { UploadField } from 'payload'
import { describe, expect, it } from 'vitest'

import { media } from '../../fields/media'

/**
 * Smoke tests for the {@link media} factory.
 *
 * PR-005 adds `media()` in isolation — no collection/global/block consumes
 * it yet. These tests pin the returned UploadField shape.
 *
 * Note: the PR-005 spec listed `mimeTypes`, `focalPoint`, and
 * `adminThumbnail` as UploadField properties, but those are collection-level
 * upload-config props in Payload's type system — see the deviation note in
 * `src/fields/media.ts`. This factory only emits the field-level config.
 */

describe('media()', () => {
  it('returns an upload field bound to the "media" collection by default', () => {
    const field = media() as UploadField
    expect(field.type).toBe('upload')
    expect(field.relationTo).toBe('media')
  })

  it('enables displayPreview by default (admin shows image thumbnails)', () => {
    const field = media() as UploadField
    expect(field.displayPreview).toBe(true)
  })

  it('defaults the field name to "media"', () => {
    const field = media() as UploadField
    expect(field.name).toBe('media')
  })

  it('accepts an alternate `relationTo`', () => {
    const field = media({ relationTo: 'team-members' }) as UploadField
    expect(field.relationTo).toBe('team-members')
  })

  it('applies `overrides` via deepMerge (rename + required)', () => {
    const field = media({
      overrides: { name: 'image', required: true },
    }) as UploadField
    expect(field.name).toBe('image')
    expect(field.required).toBe(true)
  })

  it('preserves displayPreview when overrides set other props', () => {
    const field = media({
      overrides: { name: 'image' },
    }) as UploadField
    expect(field.displayPreview).toBe(true)
    expect(field.name).toBe('image')
  })
})
