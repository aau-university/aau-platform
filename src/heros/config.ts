import type { GroupField } from 'payload'

import { linkGroup } from '@/fields/linkGroup'
import { localizedRichText } from '@/fields/localized'
import { media } from '@/fields/media'

/**
 * `heroField` — the canonical AAU page hero group field.
 *
 * Ported from the official Payload template's `src/heros/config.ts`. Adapted
 * to AAU conventions:
 *
 *   - `richText` uses AAU's {@link localizedRichText} factory (single-field,
 *     native Payload localization — `localized: true`, no `*Ar`/`*En`
 *     duplicates). The official template does NOT localize the hero richText;
 *     AAU requires `ar` + `en` values for every public-facing string.
 *   - `links` uses AAU's {@link linkGroup} factory, capped at `maxRows: 2`
 *     (primary + secondary CTA — same as the template).
 *   - `media` uses AAU's {@link media} factory, which emits an `UploadField`
 *     bound to the `media` collection with `displayPreview: true`.
 *   - `type` is a 4-variant select (`highImpact | mediumImpact | lowImpact |
 *     postHero`), defaulting to `lowImpact`. The template uses a 5-variant
 *     select that includes `none`; AAU drops `none` (the dispatcher treats
 *     `null` hero data as "render nothing" instead — see
 *     {@link RenderHero}).
 *   - `media` is shown only for `highImpact` and `mediumImpact` (the variants
 *     that actually render an image). `lowImpact` is text-only; `postHero`
 *     sources its image from the parent post's `heroImage` field.
 *
 * Exported as a `GroupField` (not a factory function) to match the official
 * template's shape. The stricter `GroupField` type (vs the `Field` union the
 * template uses) lets consumers override `admin.condition` without TypeScript
 * widening the admin type to the union. Consumers spread it inline and may
 * override `admin` (e.g. the Pages collection adds `admin.condition` to hide
 * the hero group on the homepage, which uses a HeroBlock in its layout
 * instead).
 *
 * Wired to the Pages collection in PR-009. PR-017 (Phase 1 schema work)
 * migrates legacy `heroImage`/`heroBadge` fields into this hero group.
 */
export const heroField: GroupField = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Type',
      options: [
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
        {
          label: 'Post Hero',
          value: 'postHero',
        },
      ],
      required: true,
    },
    localizedRichText('richText', {
      label: 'Content',
    }),
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    media({
      overrides: {
        name: 'media',
        admin: {
          condition: (_, { type } = {}) =>
            ['highImpact', 'mediumImpact'].includes(type as string),
        },
        required: true,
      },
    }),
  ],
  label: false,
}
