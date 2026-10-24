import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicBlogPosts } from '@/lib/payload/get-public-blog-posts'
import { BlogGridSection } from '@/components/sections/BlogGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type BlogGridBlock = Extract<PageLayoutBlock, { blockType: 'blogGrid' }>

function clampLimit(n?: number | null): number {
  if (typeof n !== 'number' || isNaN(n)) return 4
  return Math.max(1, Math.min(8, Math.trunc(n)))
}

export async function BlogGridBlock_Server(props: BlogGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar' } = props
  const posts = await getPublicBlogPosts({ limit: clampLimit(maxItems), locale, readContext: props.readContext })
  return <BlogGridSection posts={posts} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
