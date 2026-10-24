'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'

import { Container } from '@/components/ui/Container'
import { BlogCard } from '@/components/cards/BlogCard'
import { Pagination } from '@/components/Pagination'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicBlogPostItem } from '@/lib/payload/get-public-blog-posts'
import type { Locale } from '@/i18n/locale'

export interface BlogListSectionProps {
  posts: PublicBlogPostItem[]
  totalPages: number
  currentPage: number
  locale: Locale
}

export function BlogListSection({ posts, totalPages, currentPage, locale }: BlogListSectionProps) {
  const isAr = locale === 'ar'

  // Unique categories for filter pills
  const categories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean)))
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered =
    activeCategory === 'all' ? posts : posts.filter((p) => p.category === activeCategory)

  // Split: first post as featured (large), rest as regular grid
  const [featured, ...rest] = filtered

  return (
    <Container className="py-14">
      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={[
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200',
              activeCategory === 'all'
                ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                : 'border-border/60 text-muted-foreground hover:border-secondary/50 hover:text-foreground',
            ].join(' ')}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200',
                activeCategory === cat
                  ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                  : 'border-border/60 text-muted-foreground hover:border-secondary/50 hover:text-foreground',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <PenLine className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">{isAr ? 'لا توجد مقالات' : 'No Articles'}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isAr
              ? 'لا توجد مقالات متاحة حالياً في هذا التصنيف. تابعنا قريباً.'
              : 'No articles are available in this category right now. Check back soon.'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* Featured post */}
          {featured && (
            <motion.div
              className="mb-8"
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              variants={animationPresets.fadeUp}
            >
              <BlogCard post={featured} locale={locale} featured />
            </motion.div>
          )}

          {/* Regular grid */}
          {rest.length > 0 && (
            <motion.div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              variants={animationPresets.stagger}
            >
              {rest.map((post) => (
                <motion.div
                  key={post.id}
                  variants={animationPresets.staggerItem}
                  className="h-full"
                >
                  <BlogCard post={post} locale={locale} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 overflow-x-auto pb-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/blog"
                locale={locale}
                className="min-w-max justify-start px-1 sm:justify-center"
              />
            </div>
          )}
        </>
      )}
    </Container>
  )
}
