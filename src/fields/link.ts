import type { CollectionSlug, Field, GroupField } from 'payload'

import { deepMerge } from './deepMerge'

/**
 * Appearance variants for the {@link link} factory. The four canonical AAU
 * variants match the official Payload template's default + outline set, plus
 * the secondary/ghost variants used by the AAU design system.
 */
export type LinkAppearances = 'default' | 'secondary' | 'ghost' | 'outline'

export const appearanceOptions: Record<LinkAppearances, { label: string; value: string }> = {
  default: {
    label: 'Default',
    value: 'default',
  },
  secondary: {
    label: 'Secondary',
    value: 'secondary',
  },
  ghost: {
    label: 'Ghost',
    value: 'ghost',
  },
  outline: {
    label: 'Outline',
    value: 'outline',
  },
}

type LinkOptions = {
  /**
   * Restrict the available appearance variants, or pass `false` to omit the
   * `appearance` field entirely. When omitted, all four variants are offered.
   */
  appearances?: LinkAppearances[] | false
  /**
   * Override the relationship target(s) for the `reference` field. Defaults to
   * `['pages']`. Pass a single slug or an array of slugs.
   */
  relationTo?: CollectionSlug | CollectionSlug[]
  /**
   * Partial overrides applied on top of the generated group field via
   * {@link deepMerge}. Use this to rename the field, set `required`, tweak
   * admin widths, etc.
   */
  overrides?: Partial<GroupField>
}

type LinkType = (options?: LinkOptions) => Field

/**
 * Build the canonical AAU link group field.
 *
 * The group exposes a `type` radio (internal reference vs. custom URL), a
 * `reference` relationship (default: `pages`), a `url` text field, a
 * `newTab` checkbox, and an optional `appearance` select with four variants.
 *
 * Ported from the official Payload template's `fields/link.ts`, adapted to
 * AAU's `pages`-only default and four-variant appearance set. The group is
 * Each owning collection, global, or group generates its own link shape so
 * variants that omit or restrict `appearance` remain accurately typed.
 */
export const link: LinkType = ({ appearances, relationTo = 'pages', overrides = {} } = {}) => {
  const relationToArray: CollectionSlug[] = Array.isArray(relationTo)
    ? relationTo
    : [relationTo]

  const linkResult: GroupField = {
    name: 'link',
    type: 'group',
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'radio',
            admin: {
              layout: 'horizontal',
              width: '50%',
            },
            defaultValue: 'reference',
            options: [
              {
                label: 'Internal link',
                value: 'reference',
              },
              {
                label: 'Custom URL',
                value: 'custom',
              },
            ],
          },
          {
            name: 'newTab',
            type: 'checkbox',
            admin: {
              style: {
                alignSelf: 'flex-end',
              },
              width: '50%',
            },
            label: 'Open in new tab',
          },
        ],
      },
      {
        name: 'reference',
        type: 'relationship',
        admin: {
          condition: (_, siblingData) => siblingData?.type === 'reference',
        },
        label: 'Document to link to',
        relationTo: relationToArray,
        required: true,
      },
      {
        name: 'url',
        type: 'text',
        admin: {
          condition: (_, siblingData) => siblingData?.type === 'custom',
        },
        label: 'Custom URL',
        required: true,
      },
    ],
  }

  if (appearances !== false) {
    const appearanceOptionsToUse: LinkAppearances[] =
      appearances ?? (['default', 'secondary', 'ghost', 'outline'] as LinkAppearances[])

    linkResult.fields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: 'Choose how the link should be rendered.',
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse.map((appearance) => appearanceOptions[appearance]),
    })
  }

  return deepMerge(linkResult, overrides)
}
