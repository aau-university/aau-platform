import { randomUUID } from 'crypto'

import type { CollectionBeforeValidateHook } from 'payload'

const arabicToLatin: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ة: 'h',
  ء: '',
  ئ: 'y',
  ؤ: 'w',
}

/**
 * Slugs reserved for top-level public routes. A `pages` document must not
 * take any of these slugs or it would shadow a dedicated route handler
 * (checked by `validatePageSlug`).
 */
export const reservedPageSlugs = [
  'about',
  'contact',
  'colleges',
  'faculty',
  'news',
  'events',
  'blog',
  'email-request',
  'admission',
  'campus-life',
  'centers',
  'offers',
  'partners',
  'projects-studio',
  'research',
  'team',
  'faq',
  'next',
  'api',
  'admin',
] as const

/**
 * Transliterate + slugify a value into a URL-safe slug.
 *
 * Arabic characters are mapped to Latin via `arabicToLatin` first (so an
 * Arabic title yields a readable Latin slug), then non-`[a-z0-9]` runs
 * collapse to single hyphens, edges are trimmed, and the result is capped
 * at 96 chars. Returns `''` for non-string / empty input.
 */
export function slugify(value: unknown): string {
  if (typeof value !== 'string') return ''

  const transliterated = value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => arabicToLatin[char] ?? char)
    .join('')

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 96)
}

/**
 * Validate a slug string. Returns `true` when valid, or an error message
 * string (shown to the editor) when the slug is missing, over 96 chars,
 * or contains characters outside `[a-z0-9-]`. Used as a Payload field
 * `validate` callback.
 */
export function validateSlug(value: unknown): true | string {
  if (typeof value !== 'string' || value.trim() === '') return 'Slug is required.'

  const slug = value.trim()
  if (slug.length > 96) return 'Slug must be 96 characters or fewer.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Slug may contain lowercase letters, numbers, and hyphens only.'
  }

  return true
}

/**
 * Validate a `pages` slug. Runs `validateSlug` first, then additionally
 * rejects any slug in `reservedPageSlugs` (reserved for dedicated route
 * handlers — a page taking one would shadow that route).
 */
export function validatePageSlug(value: unknown): true | string {
  const baseValidation = validateSlug(value)
  if (baseValidation !== true) return baseValidation

  if (reservedPageSlugs.includes(String(value).trim() as (typeof reservedPageSlugs)[number])) {
    return 'This slug is reserved for a public route.'
  }

  return true
}

/**
 * Resolve a possibly-localized value to its `ar` (then `en`) string form,
 * so a slug can be derived from a localized title field. Non-object values
 * pass through; objects with no `ar`/`en` yield `undefined`.
 */
function localizedValue(value: unknown): unknown {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined

  const record = value as Record<string, unknown>
  return record.ar ?? record.en
}

/**
 * Append `-2`, `-3`, … to `slug` until no existing document collides.
 *
 * Looks up the `slug` field with `overrideAccess: true` (the uniqueness
 * check is a system concern, not a per-user one) and `req` threaded for
 * transaction safety. `currentId` excludes the doc being updated from the
 * collision check, so re-saving an existing item keeps its slug.
 */
async function makeUniqueSlug({
  collection,
  currentId,
  req,
  slug,
}: {
  collection: string
  currentId?: unknown
  req: Parameters<CollectionBeforeValidateHook>[0]['req']
  slug: string
}): Promise<string> {
  let candidate = slug
  let suffix = 2

  while (true) {
    const result = await req.payload.find({
      collection: collection as never,
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req, // thread req for transaction safety (per ADAPTERS.md)
    })

    const existing = result.docs[0] as { id?: unknown } | undefined
    if (!existing || String(existing.id) === String(currentId)) return candidate

    candidate = `${slug}-${suffix}`
    suffix += 1
  }
}

/**
 * Build a `beforeValidate` hook that auto-generates a unique slug for
 * `sourceField`'s value (Arabic-aware transliteration + de-duplication).
 *
 * Resolution order for the base slug: an explicit `data.slug` first, then
 * the source field's value, then the original doc's source field on updates,
 * then an `item-<uuid8>` fallback. The result is made unique against existing
 * docs (see `makeUniqueSlug`). Install on a collection's `hooks.beforeValidate`.
 *
 * @param sourceField - the field whose value seeds the slug (e.g. `'fullName'`)
 */
export function generateSlugBeforeValidate(sourceField: string): CollectionBeforeValidateHook {
  return async ({ collection, data, originalDoc, req }) => {
    if (!data) return data

    const existingSlug = slugify(data.slug)
    const sourceSlug = slugify(localizedValue(data[sourceField]) ?? localizedValue(originalDoc?.[sourceField]))
    const fallbackSlug = `item-${randomUUID().slice(0, 8)}`
    const baseSlug = existingSlug || sourceSlug || fallbackSlug

    data.slug = await makeUniqueSlug({
      collection: collection.slug,
      currentId: data.id ?? originalDoc?.id,
      req,
      slug: baseSlug,
    })

    return data
  }
}
