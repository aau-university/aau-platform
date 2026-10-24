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
 * `PostHero` — detail-page hero (title + meta + featured image).
 *
 * Ported from the official Payload template's
 * `src/heros/PostHero/index.tsx`. Adapted to AAU:
 *
 *   - The template's PostHero accepts a `post: Post` prop directly (it's not
 *     routed through `RenderHero` — it's used inline in the post detail
 *     page). The AAU PR-009 dispatcher routes `hero.type === 'postHero'` to
 *     this component, so it accepts the hero group fields (same as the other
 *     variants) instead of a full post object. The hero group's `richText`
 *     is rendered as the title; `links` as the meta row; `media` as the
 *     featured image.
 *   - Image rendering uses `<Media>` (PR-014) with `fill` mode + `priority`
 *     for LCP preload. The parent container is `position: relative`.
 *   - RichText rendering uses the existing `richTextToPlainText` utility.
 *     PR-014 will swap to `@/components/RichText`.
 *   - The template's author / published-date / categories meta is omitted —
 *     those fields live on the post document, not on the hero group. A
 *     future PR (PR-017+) will re-introduce post-aware meta rendering when
 *     the News/Events/BlogPosts detail pages are built.
 */
export const PostHero: React.FC<NonNullable<Page['hero']>> = ({ links, media, richText }) => {
  const title = richTextToPlainText(richText)

  return (
    <div data-testid="post-hero" className="relative -mt-[10.4rem] flex items-end">
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] text-white pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          {/*
           * TODO: swap to <RichText data={richText} /> from
           * @/components/RichText in PR-014. The temporary plain-text renderer
           * is intentional.
           */}
          {title && <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl">{title}</h1>}
          {Array.isArray(links) && links.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4 md:gap-16">
              <div className="flex flex-col gap-1">
                <ul className="flex gap-4">
                  {links.map((row, i) => {
                    const link = row?.link ?? null
                    const href = getLinkHref(link)
                    if (!href) return null
                    return (
                      <li key={i}>
                        {/*
                         * TODO: swap to <CMSLink {...link} /> from
                         * @/components/Link in PR-014.
                         */}
                        <a
                          href={href}
                          {...(link?.newTab
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          {href}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
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
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-foreground to-transparent" />
      </div>
    </div>
  )
}
