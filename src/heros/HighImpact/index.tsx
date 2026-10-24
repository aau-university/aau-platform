import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'

/**
 * Compute an `<a>` href from a generated page hero link value.
 *
 * The AAU {@link link} factory (see `src/fields/link.ts`) has no `label`
 * field — PR-014 will add `@/components/Link` (CMSLink) which falls back to
 * the referenced document's title when no label is set. For now, we render
 * the URL or slug as the link text too.
 *
 * Internal references (Pages) are surfaced as `/<slug>` when the referenced
 * Page is populated; when only the Page ID is available (depth: 0), we fall
 * back to `/<id>` so the link is still clickable in preview/test contexts.
 * Custom URLs are surfaced verbatim. Returns `null` if neither branch has
 * data.
 */
type HeroLink = NonNullable<
  NonNullable<NonNullable<Page['hero']>['links']>[number]['link']
>

function getLinkHref(link: HeroLink | null | undefined): string | null {
  if (!link) return null
  if (link.type === 'custom' && typeof link.url === 'string' && link.url) {
    return link.url
  }
  if (link.type === 'reference' && link.reference) {
    const value = link.reference.value
    if (typeof value === 'object' && value !== null && typeof value.slug === 'string') {
      return `/${value.slug}`
    }
    if (typeof value === 'number') {
      return `/${value}`
    }
  }
  return null
}

/**
 * `HighImpactHero` — full-bleed image hero.
 *
 * Ported from the official Payload template's
 * `src/heros/HighImpact/index.tsx`. Adapted to AAU:
 *
 *   - Image rendering uses `<Media>` (PR-014) with `fill` mode so the
 *     image covers the parent container. `priority` is set so the
 *     LCP image is preloaded.
 *   - RichText rendering uses the existing `richTextToPlainText` utility
 *     instead of `@/components/RichText`. PR-014 will swap to RichText.
 *   - Links render as plain `<a>` tags instead of `@/components/Link`
 *     (CMSLink). PR-014 will swap to CMSLink.
 *   - The template's `useHeaderTheme` hook (which sets the header to `dark`
 *     over the hero image) is intentionally NOT ported — the AAU SiteHeader
 *     owns its own theme switching. PR-014 may re-introduce a hook contract
 *     once the providers layer lands.
 */
export const HighImpactHero: React.FC<NonNullable<Page['hero']>> = ({
  links,
  media,
  richText,
}) => {
  const text = richTextToPlainText(richText)

  return (
    <div
      data-testid="high-impact-hero"
      className="relative -mt-[10.4rem] flex items-center justify-center text-white"
      data-theme="dark"
    >
      <div className="container mb-8 z-10 relative flex items-center justify-center">
        <div className="max-w-[36.5rem] md:text-center">
          {/*
           * TODO: swap to <RichText data={richText} /> from @/components/RichText
           * in PR-014. The temporary plain-text renderer is intentional —
           * PR-014 ports the official template's RichText component.
           */}
          {text && <div className="mb-6">{text}</div>}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex md:justify-center gap-4">
              {links.map((row, i) => {
                const link = row?.link ?? null
                const href = getLinkHref(link)
                if (!href) return null
                return (
                  <li key={i}>
                    {/*
                     * TODO: swap to <CMSLink {...link} /> from @/components/Link
                     * in PR-014. The AAU link group has no `label` field yet;
                     * PR-014 will introduce a label-aware CMSLink.
                     */}
                    <a
                      href={href}
                      {...(link?.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {href}
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="min-h-[80vh] select-none relative">
        <Media
          resource={media}
          fill
          priority
          className="-z-10 object-cover"
        />
      </div>
    </div>
  )
}
