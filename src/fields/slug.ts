import type { RowField } from 'payload'
import { slugField } from 'payload'

import { slugify as arabicSlugify } from '../hooks/generateSlug'

import { deepMerge } from './deepMerge'

type SlugOptions = {
  /**
   * Name of the source field to generate the slug from (e.g. `'title'`,
   * `'name'`). Forwarded to `slugField`'s `useAsSlug` option.
   *
   * @default 'title'
   */
  field?: string
  /**
   * Override for the generated slug field's name (defaults to `'slug'`).
   * Forwarded to `slugField`'s `name` option.
   */
  name?: string
  /**
   * Partial overrides applied on top of the generated `RowField` via
   * {@link deepMerge}. Use this to toggle `required`, adjust admin
   * components, etc. For granular row-level manipulation (e.g. rewriting
   * the inner text field's validate), call `slugField` directly.
   */
  overrides?: Partial<RowField>
}

/**
 * Build a slug field backed by Payload's `slugField` helper.
 *
 * The slug is auto-generated from the source field (default `title`) using
 * AAU's Arabic-aware transliteration (`src/hooks/generateSlug.ts#slugify`).
 * The transliteration map (`arabicToLatin`) lives in the hook file so the
 * existing beforeValidate hook (active until PR-011 swaps callers to this
 * factory) and this factory share one source of truth. PR-011 is
 * responsible for deleting the hook once all collections have migrated to
 * `slug()`; PR-005 only ports the factory in isolation.
 *
 * Returned shape: a `RowField` containing the hidden `generateSlug`
 * checkbox (with the beforeChange hook that runs the slugify) and the
 * visible `slug` text field (with the `@payloadcms/next/client#SlugField`
 * admin component for live preview). See `payload/dist/fields/baseFields/slug`
 * for the full generated structure.
 *
 * @example
 *   // In a collection config:
 *   fields: [
 *     { name: 'title', type: 'text', required: true },
 *     slug({ field: 'title' }),
 *   ]
 */
export function slug({ field, name, overrides = {} }: SlugOptions = {}): RowField {
  const generated = slugField({
    useAsSlug: field ?? 'title',
    name,
    slugify: ({ valueToSlugify }) => arabicSlugify(valueToSlugify),
  })

  return deepMerge(generated, overrides)
}
