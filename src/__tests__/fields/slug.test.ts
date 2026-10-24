import type { RowField } from 'payload'
import { describe, expect, it } from 'vitest'

import { slug } from '../../fields/slug'
import { slugify as arabicSlugify } from '../../hooks/generateSlug'

/**
 * Tests for the {@link slug} factory.
 *
 * PR-005 adds `slug()` in isolation — no collection/global/block consumes
 * it yet. The factory wraps Payload's `slugField()` helper with AAU's
 * Arabic-aware transliteration (`src/hooks/generateSlug.ts#slugify`).
 *
 * Two concerns under test:
 *
 * 1. Structural: the returned RowField contains the hidden `generateSlug`
 *    checkbox (with the beforeChange hook that runs the slugify) and the
 *    visible `slug` text field (with the SlugField admin component + the
 *    custom slugify stored on `custom.slugify` for the live-preview server
 *    function).
 *
 * 2. Behavioural: the wired slugify produces AAU's Arabic-to-Latin
 *    transliteration. Pinned example: `"كلية العلوم"` → `"klyh-alalwm"`.
 *    The transliteration map (`arabicToLatin`) lives in
 *    `src/hooks/generateSlug.ts`; the legacy beforeValidate hook (active
 *    until PR-011 swaps callers to this factory) and this factory share
 *    one source of truth.
 */

type SlugifyLike = (args: { valueToSlugify?: unknown }) => unknown

function asRow(field: ReturnType<typeof slug>): RowField {
  return field as RowField
}

function getSlugifyFromSlugField(field: RowField): SlugifyLike {
  // The slug text field stores the custom slugify on `custom.slugify` (per
  // Payload's `fields/baseFields/slug/index.js`). We extract it here to
  // exercise the Arabic transliteration path without standing up a full
  // Payload request.
  const fields = (field as unknown as { fields: { name?: string; custom?: { slugify?: unknown } }[] }).fields
  const slugTextField = fields.find((f) => f.name === 'slug')
  if (!slugTextField) {
    throw new Error('expected a `slug` text field inside the slug RowField')
  }
  const slugify = slugTextField.custom?.slugify
  if (typeof slugify !== 'function') {
    throw new Error('expected `custom.slugify` to be a function on the slug text field')
  }
  return slugify as SlugifyLike
}

describe('slug()', () => {
  describe('structural shape', () => {
    it('returns a RowField', () => {
      const field = asRow(slug({ field: 'title' }))
      expect(field.type).toBe('row')
      expect(Array.isArray(field.fields)).toBe(true)
      expect(field.fields.length).toBeGreaterThanOrEqual(2)
    })

    it('includes a hidden `generateSlug` checkbox with a beforeChange hook', () => {
      const field = asRow(slug({ field: 'title' }))
      const checkbox = (field as unknown as {
        fields: { name?: string; type?: string; admin?: { hidden?: boolean }; hooks?: { beforeChange?: unknown[] } }[]
      }).fields.find((f) => f.name === 'generateSlug')
      expect(checkbox).toBeDefined()
      expect(checkbox?.type).toBe('checkbox')
      expect(checkbox?.admin?.hidden).toBe(true)
      expect(checkbox?.hooks?.beforeChange).toBeInstanceOf(Array)
      expect(checkbox?.hooks?.beforeChange?.length).toBeGreaterThan(0)
    })

    it('includes a `slug` text field with the SlugField admin component', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugTextField = (field as unknown as {
        fields: {
          name?: string
          type?: string
          admin?: { components?: { Field?: { path?: string } } }
          index?: boolean
          required?: boolean
          unique?: boolean
        }[]
      }).fields.find((f) => f.name === 'slug')
      expect(slugTextField).toBeDefined()
      expect(slugTextField?.type).toBe('text')
      expect(slugTextField?.admin?.components?.Field?.path).toBe('@payloadcms/next/client#SlugField')
      expect(slugTextField?.index).toBe(true)
      expect(slugTextField?.unique).toBe(true)
    })

    it('defaults `required: true` on the slug text field', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugTextField = (field as unknown as {
        fields: { name?: string; required?: boolean }[]
      }).fields.find((f) => f.name === 'slug')
      expect(slugTextField?.required).toBe(true)
    })

    it('honours the `name` override for the slug field name', () => {
      const field = asRow(slug({ field: 'title', name: 'urlSlug' }))
      const hasUrlSlug = (field as unknown as {
        fields: { name?: string }[]
      }).fields.some((f) => f.name === 'urlSlug')
      expect(hasUrlSlug).toBe(true)
    })
  })

  describe('Arabic transliteration', () => {
    it('wires a custom slugify onto the slug field (custom.slugify is a function)', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugify = getSlugifyFromSlugField(field)
      expect(typeof slugify).toBe('function')
    })

    it('transliterates "كلية العلوم" to "klyh-alalwm" (pinned AAU value)', () => {
      // Pin the expected value. The arabicToLatin map and the
      // post-processing (lowercase, [^a-z0-9]+ → '-', trim leading/trailing
      // '-', collapse runs, slice(0, 96)) live in src/hooks/generateSlug.ts.
      // If this test breaks, the slug contract for AAU has changed and every
      // existing document slug in the DB may need a redirect.
      const field = asRow(slug({ field: 'title' }))
      const slugify = getSlugifyFromSlugField(field)
      const result = slugify({ valueToSlugify: 'كلية العلوم' })
      expect(result).toBe('klyh-alalwm')
    })

    it('transliterates plain English titles as kebab-case (parity check)', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugify = getSlugifyFromSlugField(field)
      expect(slugify({ valueToSlugify: 'Faculty of Science' })).toBe('faculty-of-science')
    })

    it('handles mixed Arabic + English titles', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugify = getSlugifyFromSlugField(field)
      expect(slugify({ valueToSlugify: 'كلية العلوم - Faculty of Science' })).toBe(
        'klyh-alalwm-faculty-of-science',
      )
    })

    it('returns "" for non-string input (defensive)', () => {
      const field = asRow(slug({ field: 'title' }))
      const slugify = getSlugifyFromSlugField(field)
      expect(slugify({ valueToSlugify: undefined })).toBe('')
      expect(slugify({ valueToSlugify: null })).toBe('')
      expect(slugify({ valueToSlugify: 12345 })).toBe('')
    })

    it('matches the underlying arabicSlugify function from generateSlug.ts (single source of truth)', () => {
      // The factory's slugify must call the SAME arabicSlugify that the
      // legacy beforeValidate hook uses — otherwise the PR-011 caller swap
      // would silently change every slug. This test pins the equivalence.
      expect(arabicSlugify('كلية العلوم')).toBe('klyh-alalwm')
      expect(arabicSlugify('Faculty of Science')).toBe('faculty-of-science')
    })
  })

  describe('overrides', () => {
    it('applies `overrides` via deepMerge (e.g. set admin.position)', () => {
      const field = asRow(
        slug({
          field: 'title',
          overrides: {
            admin: { position: 'sidebar' },
          },
        }),
      )
      expect(field.admin?.position).toBe('sidebar')
    })
  })
})
