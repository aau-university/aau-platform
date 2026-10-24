import type { Field, RichTextField, TextareaField, TextField } from 'payload'

/**
 * Options for the `localizedText` factory.
 *
 * Uses `Omit<TextField, 'localized' | 'name' | 'type'>` rather than an
 * explicit `Pick<>` allowlist so that future Payload releases adding new
 * text-field options (e.g. new admin components, validators) are
 * automatically accepted by this factory without a code change. The three
 * omitted properties are set by the factory itself (`name`, `type`,
 * `localized`) and must never be overrideable from the call site.
 *
 * NOTE: `TextField` is a discriminated union (the `hasMany: true | false`
 * variants). `Omit<>` distributes over the union members and widens
 * `hasMany` to `boolean | undefined`, so the constructed object is cast
 * back to `TextField` at the return site. This is a TypeScript-level
 * concern only — the runtime value is well-formed.
 */
export type LocalizedTextOptions = Omit<TextField, 'localized' | 'name' | 'type'>

/**
 * Options for the `localizedTextarea` factory. See {@link LocalizedTextOptions}
 * for the rationale on using `Omit<>` over `Pick<>`. `TextareaField` is a
 * single object type (not a union), so no cast is needed at the return site.
 */
export type LocalizedTextareaOptions = Omit<TextareaField, 'localized' | 'name' | 'type'>

/**
 * Options for the `localizedRichText` factory. See {@link LocalizedTextOptions}
 * for the rationale on using `Omit<>` over `Pick<>`. `RichTextField` is a
 * single object type (not a union), so no cast is needed at the return site.
 */
export type LocalizedRichTextOptions = Omit<RichTextField, 'localized' | 'name' | 'type'>

/**
 * Create a localized `text` field. Localized fields store one value per
 * locale (AAU locales: `ar` default, `en` fallback) using Payload's native
 * localization — no `*Ar`/`*En` duplicate fields.
 *
 * @example
 *   localizedText('title', { required: true })
 */
export function localizedText(name: string, options: LocalizedTextOptions = {}): TextField {
  return {
    name,
    type: 'text',
    localized: true,
    ...options,
  } as TextField
}

/**
 * Create a localized `textarea` field. See {@link localizedText} for the
 * localization contract.
 */
export function localizedTextarea(
  name: string,
  options: LocalizedTextareaOptions = {},
): TextareaField {
  return {
    name,
    type: 'textarea',
    localized: true,
    ...options,
  }
}

/**
 * Create a localized `richText` field. See {@link localizedText} for the
 * localization contract.
 */
export function localizedRichText(
  name: string,
  options: LocalizedRichTextOptions = {},
): RichTextField {
  return {
    name,
    type: 'richText',
    localized: true,
    ...options,
  }
}

/**
 * Generic localization helper — wraps any field that supports `localized`
 * (text, textarea, richText, json, etc.) and forces `localized: true`. Use
 * this for one-off localized fields that don't fit the text/textarea/richText
 * presets.
 *
 * The input field's existing `localized` value (if any) is overridden. The
 * field is returned with a shallow clone so the caller's original object is
 * not mutated. A cast through `TField` is needed because the `Field` union
 * contains variants without a `localized` property — at runtime, Payload
 * ignores `localized: true` on fields that don't support it (e.g. `row`,
 * `collapsible`, `tabs`), so the call is safe but only meaningful on
 * data-bearing fields.
 *
 * @example
 *   const metadataField: JSONField = { name: 'metadata', type: 'json' }
 *   localized<JSONField>(metadataField)
 */
export function localized<TField extends Field>(field: TField): TField {
  return {
    ...field,
    localized: true,
  } as TField
}
