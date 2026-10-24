import type { CollectionSlug, UploadField } from 'payload'

import { deepMerge } from './deepMerge'

type MediaOptions = {
  /**
   * Override the upload target collection slug. Defaults to `'media'`.
   */
  relationTo?: CollectionSlug
  /**
   * Partial overrides applied on top of the generated `UploadField` via
   * {@link deepMerge}. Use this to rename the field (`name`), set
   * `required`, toggle `displayPreview`, set `maxDepth`, etc.
   */
  overrides?: Partial<UploadField>
}

/**
 * Build the canonical AAU media upload field.
 *
 * Returns a Payload `UploadField` bound to the AAU `media` collection by
 * default, with `displayPreview: true` so the admin shows image thumbnails
 * inline in the relationship picker.
 *
 * ## Deviation from the PR-005 spec (documented)
 *
 * The PR-005 task description lists `mimeTypes`, `focalPoint`, and
 * `adminThumbnail` as UploadField properties. They are NOT — in Payload's
 * type system those live on the COLLECTION-level `upload` config
 * (`CollectionConfig.upload: { mimeTypes, focalPoint, adminThumbnail }`),
 * not on the field-level `UploadField`. See:
 *
 *   - `payload/dist/uploads/types.d.ts` — `UploadConfig` (collection-level)
 *   - `payload/dist/fields/config/types.d.ts` — `UploadField` (field-level)
 *
 * The official Payload template confirms this: `templates/website/src/collections/Media.ts`
 * sets `upload: { adminThumbnail: 'thumbnail', focalPoint: true, imageSizes: [...] }`
 * on the collection, not on any field.
 *
 * PR-010 (collection refactor) will set these properties on the AAU Media
 * collection's `upload` block. This factory only emits the field-level
 * config; consumers (e.g. `image: media({ overrides: { name: 'image', required: true } })`)
 * get a typed `UploadField` they can drop into any collection/global/block.
 *
 * Not wired to any collection/global/block in this PR (PR-005). Consumers
 * arrive in PR-007 (blocks), PR-010/011 (collections), and PR-026 (globals).
 *
 * @example
 *   media({ overrides: { name: 'image', required: true } })
 */
export function media({ relationTo = 'media', overrides = {} }: MediaOptions = {}): UploadField {
  const generated: UploadField = {
    name: 'media',
    type: 'upload',
    relationTo,
    displayPreview: true,
  } as UploadField

  return deepMerge(generated, overrides) as UploadField
}
