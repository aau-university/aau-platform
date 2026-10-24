import React from 'react'

import type { Page } from '@/payload-types'

import { HighImpactHero } from '@/heros/HighImpact'
import { LowImpactHero } from '@/heros/LowImpact'
import { MediumImpactHero } from '@/heros/MediumImpact'
import { PostHero } from '@/heros/PostHero'

/**
 * `RenderHero` — the page hero dispatcher.
 *
 * Ported from the official Payload template's `src/heros/RenderHero.tsx`.
 * Adapted to AAU's 4-variant set (`highImpact | mediumImpact | lowImpact |
 * postHero`) — the template's `none` variant is dropped; nullish hero data
 * short-circuits to `null` here instead, so pages without a hero value render
 * nothing without crashing.
 *
 * The dispatcher is intentionally tiny — it owns no UI of its own. Each
 * variant component is responsible for its own layout, image rendering, and
 * link presentation. Variant components are self-contained in this PR
 * (temporary `<img>` tags + minimal RichText/Link renderers) and will be
 * upgraded to use `@/components/Media`, `@/components/RichText`, and
 * `@/components/Link` (CMSLink) once those land in PR-014.
 *
 * Falls back to {@link LowImpactHero} for unknown types (matches the
 * template's defensive default).
 */
export const RenderHero: React.FC<{ hero: Page['hero'] | null }> = ({ hero }) => {
  if (!hero) return null

  switch (hero.type) {
    case 'highImpact':
      return <HighImpactHero {...hero} />
    case 'mediumImpact':
      return <MediumImpactHero {...hero} />
    case 'postHero':
      return <PostHero {...hero} />
    case 'lowImpact':
    default:
      return <LowImpactHero {...hero} />
  }
}
