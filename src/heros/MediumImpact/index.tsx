import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import { richTextToPlainText } from '@/lib/rich-text/rich-text-to-plain-text'

/**
 * Compute an `<a>` href from a generated page hero link value. Internal
 * references (Pages) are surfaced as `/<slug>` when the Page is populated,
 * `/<id>` when only the ID is available (depth: 0). Custom URLs are
 * surfaced verbatim. Returns `null` if neither branch has data.
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
 * `MediumImpactHero` — medium-impact hero with a side image below the text.
 *
 * Ported from the official Payload template's
 * `src/heros/MediumImpact/index.tsx`. Adapted to AAU:
 *
 *   - Image rendering uses `<Media>` (PR-014). The image is rendered
 *     in fixed-size mode (the Media doc's `width` / `height` drive the
 *     aspect ratio) with negative horizontal margins to break out of
 *     the container gutter on wide screens.
 *   - RichText rendering uses the existing `richTextToPlainText` utility.
 *     PR-014 will swap to `@/components/RichText`.
 *   - Links render as plain `<a>` tags. PR-014 will swap to
 *     `@/components/Link` (CMSLink).
 */
export const MediumImpactHero: React.FC<NonNullable<Page['hero']>> = ({
  links,
  media,
  richText,
}) => {
  const text = richTextToPlainText(richText)

  return (
    <div data-testid="medium-impact-hero" className="">
      <div className="container mb-8">
        {/*
         * TODO: swap to <RichText data={richText} /> from @/components/RichText
         * in PR-014. The temporary plain-text renderer is intentional.
         */}
        {text && <div className="mb-6">{text}</div>}

        {Array.isArray(links) && links.length > 0 && (
          <ul className="flex gap-4">
            {links.map((row, i) => {
              const link = row?.link ?? null
              const href = getLinkHref(link)
              if (!href) return null
              return (
                <li key={i}>
                  {/*
                   * TODO: swap to <CMSLink {...link} /> from @/components/Link
                   * in PR-014.
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
      <div className="container">
        <Media
          resource={media}
          className="-mx-4 md:-mx-8 2xl:-mx-16"
        />
      </div>
    </div>
  )
}
