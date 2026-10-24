import React from 'react'

import type { Page } from '@/payload-types'

import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'

/**
 * `LowImpactHero` — text-only hero (no image).
 *
 * Ported from the official Payload template's
 * `src/heros/LowImpact/index.tsx`. Adapted to AAU:
 *
 *   - RichText rendering uses the existing `richTextToPlainText` utility.
 *     PR-014 will swap to `@/components/RichText` (TODO: swap to
 *     `@/components/RichText` in PR-014).
 *   - The template's discriminated `children | richText` prop union is
 *     simplified to just `richText` for the AAU port — the dispatcher always
 *     spreads the hero group, and `children`-based composition isn't used by
 *     any caller in the AAU tree. PR-014 may re-introduce the union if a
 *     caller needs it.
 *
 * This is the default fallback in {@link RenderHero} for unknown or
 * missing `type` values.
 */
export const LowImpactHero: React.FC<NonNullable<Page['hero']>> = ({ richText }) => {
  const text = richTextToPlainText(richText)

  return (
    <div data-testid="low-impact-hero" className="container mt-16">
      <div className="max-w-[48rem]">
        {/*
         * TODO: swap to <RichText data={richText} enableGutter={false} /> from
         * @/components/RichText in PR-014. The temporary plain-text renderer
         * is intentional — PR-014 ports the official template's RichText.
         */}
        {text && <div>{text}</div>}
      </div>
    </div>
  )
}
