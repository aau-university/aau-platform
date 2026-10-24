'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { animationPresets, defaultViewport } from '@/lib/animation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { BlogCard } from '@/components/cards/BlogCard'
import type { PublicBlogPostItem } from '@/lib/payload/get-public-blog-posts'
import type { HomeSectionText } from '@/lib/payload/get-home-data'
import type { Locale } from '@/i18n/locale'

export interface BlogGridSectionProps {
  posts: PublicBlogPostItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function BlogGridSection({
  posts,
  sectionContent,
  disableInnerContainer = false,
}: BlogGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const locale = language as Locale
  const Wrapper = disableInnerContainer ? Fragment : Container

  if (posts.length === 0) return null

  const title = sectionContent?.title || (isAr ? 'المدونة' : 'Blog')
  const description = sectionContent?.description || ''

  return (
    <section id="blog" className="py-16 md:py-20 bg-background">
      <Wrapper>
        <SectionHeader
          icon={BookOpen}
          badge={isAr ? 'أحدث المقالات' : 'Latest Articles'}
          title={title}
          description={description || undefined}
        />

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {posts.map((post) => (
            <motion.div
              key={post.id}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <BlogCard post={post} locale={locale} />
            </motion.div>
          ))}
        </motion.div>
      </Wrapper>
    </section>
  )
}
