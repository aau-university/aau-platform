import type { ArrayField, Field } from 'payload'

import type { LinkAppearances } from './link'

import { deepMerge } from './deepMerge'
import { link } from './link'

type LinkGroupOptions = {
  /**
   * Forwarded to {@link link}. Restrict the available appearance variants, or
   * pass `false` to omit the `appearance` field on each link.
   */
  appearances?: LinkAppearances[] | false
  /**
   * Override the relationship target(s) for the inner `reference` field.
   * Forwarded to {@link link}. Defaults to `['pages']`.
   */
  relationTo?: Parameters<typeof link>[0] extends infer T
    ? T extends { relationTo?: infer R }
      ? R
      : never
    : never
  /**
   * Partial overrides applied on top of the generated array field via
   * {@link deepMerge}. Use this to rename the field, set `maxRows`, etc.
   */
  overrides?: Partial<ArrayField>
}

type LinkGroupType = (options?: LinkGroupOptions) => Field

/**
 * Build an array-of-links field. Each row uses the canonical {@link link}
 * group, so consumers (navigation menus, hero CTAs, footer link lists, etc.)
 * get a consistent link shape across the schema.
 *
 * Ported from the official Payload template's `fields/linkGroup.ts`. Adapted
 * to forward `relationTo` (AAU default: `pages`) in addition to `appearances`
 * and `overrides`.
 *
 * Not wired to any collection/global/block in this PR (PR-005). Consumers
 * arrive in PR-007 (blocks), PR-010/011 (collections), and PR-026 (globals).
 */
export const linkGroup: LinkGroupType = ({ appearances, relationTo, overrides = {} } = {}) => {
  const generatedLinkGroup: Field = {
    name: 'links',
    type: 'array',
    fields: [
      link({
        appearances,
        relationTo,
      }),
    ],
    admin: {
      initCollapsed: true,
    },
  }

  return deepMerge(generatedLinkGroup, overrides)
}
