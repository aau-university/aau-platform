import type { TextFieldSingleValidation } from 'payload'
import {
  BoldFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  lexicalEditor,
  UnderlineFeature,
  type LinkFields,
} from '@payloadcms/richtext-lexical'

/**
 * Default Lexical editor for AAU rich-text fields.
 *
 * Ported from the official Payload template's `fields/defaultLexical.ts`.
 * Adapted to AAU's collection set:
 *
 *   - `enabledCollections`: `['pages', 'blog-posts']` (AAU has no `posts`
 *     collection; `blog-posts` is the long-form content equivalent).
 *
 * The four base features (Paragraph, Underline, Bold, Italic) match the
 * template verbatim. The custom `LinkFeature` reuses the template's
 * "filter URL, then re-add a custom URL field with `linkType`-aware
 * validation" pattern — the canonical Payload recipe. The standalone
 * {@link link} group factory (used by `linkGroup`/blocks/globals) is a
 * separate concern: the Lexical LinkFeature has its own flat field schema
 * (a `linkType` radio, not the `type` radio of the group form), so the two
 * cannot share a single field config without breaking the editor's
 * validation contract.
 *
 * Exported as a `LexicalEditor` instance (not a factory function) to match
 * the template — `editor: defaultLexical` in a collection config.
 */
export const defaultLexical = lexicalEditor({
  features: [
    ParagraphFeature(),
    UnderlineFeature(),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({
      enabledCollections: ['pages', 'blog-posts'],
      fields: ({ defaultFields }) => {
        const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
          if ('name' in field && field.name === 'url') return false
          return true
        })

        return [
          ...defaultFieldsWithoutUrl,
          {
            name: 'url',
            type: 'text',
            admin: {
              condition: (_data, siblingData) => siblingData?.linkType !== 'internal',
            },
            label: ({ t }) => t('fields:enterURL'),
            required: true,
            validate: ((value, options) => {
              if ((options?.siblingData as LinkFields)?.linkType === 'internal') {
                // No validation needed — internal links store a doc reference,
                // not a URL.
                return true
              }
              return value ? true : 'URL is required'
            }) as TextFieldSingleValidation,
          },
        ]
      },
    }),
  ],
})
