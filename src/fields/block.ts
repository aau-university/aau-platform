import type { Block, BlocksField } from 'payload'

import { deepMerge } from './deepMerge'

type BlockOptions = {
  /**
   * The block definitions selectable in the admin. Required — a blocks
   * field with no blocks is meaningless.
   */
  blocks: Block[]
  /**
   * Mark the field as required (at least one block must be present).
   * @default false
   */
  required?: boolean
  /**
   * Partial overrides applied on top of the generated `BlocksField` via
   * {@link deepMerge}. Use this to rename the field (`name`), set
   * `minRows`/`maxRows`, tweak admin widths, etc.
   */
  overrides?: Partial<BlocksField>
}

/**
 * Build the canonical AAU blocks field.
 *
 * Defaults:
 *   - `name: 'blocks'` (override via `overrides.name`)
 *   - `admin.initCollapsed: true` (collapse the block list by default)
 *   - `required: false` (override via the `required` option)
 *
 * The official Payload template doesn't ship a `block` factory — this is an
 * AAU-specific helper to standardise the repeated `{ name: 'blocks', type:
 * 'blocks', admin: { initCollapsed: true }, blocks: [...] }` pattern across
 * the 20+ blocks fields planned for PR-007 / PR-023.
 *
 * Not wired to any collection/global/block in this PR (PR-005). Consumers
 * arrive in PR-007 (blocks), PR-010/011 (collections), and PR-026 (globals).
 *
 * @example
 *   block({ blocks: [HeroBlock, CTABlock], required: true })
 *   block({ blocks: [HeroBlock], overrides: { name: 'layout' } })
 */
export function block({ blocks, required, overrides = {} }: BlockOptions): BlocksField {
  const generated: BlocksField = {
    name: 'blocks',
    type: 'blocks',
    blocks,
    required,
    admin: {
      initCollapsed: true,
    },
  }

  return deepMerge(generated, overrides)
}
