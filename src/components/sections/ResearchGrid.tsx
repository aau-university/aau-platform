'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ResearchCard } from '@/components/cards/ResearchCard'
import type { PublicResearchArticleItem } from '@/lib/payload/get-public-research'
import type { HomeSectionText } from '@/lib/payload/get-home-data'
import { useLanguage } from '@/i18n/LanguageProvider'

export interface ResearchGridSectionProps {
  items: PublicResearchArticleItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function ResearchGridSection({
  items,
  sectionContent,
  disableInnerContainer,
}: ResearchGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const title =
    sectionContent?.title || (isAr ? 'الأبحاث والمنشورات العلمية' : 'Research Publications')
  const description = sectionContent?.description

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = items.map((item) => item.categoryName).filter(Boolean)
    return Array.from(new Set(cats))
  }, [items])

  const filterOptions = useMemo(
    () => [
      { value: 'all', label: isAr ? 'الكل' : 'All' },
      ...categories.map((category) => ({ value: category, label: category })),
    ],
    [categories, isAr],
  )

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((item) => item.categoryName === activeCategory)
  }, [items, activeCategory])

  const inner = (
    <div className="flex flex-col gap-10">
      <SectionHeader
        icon={BookOpen}
        badge={isAr ? 'البحث العلمي والابتكار' : 'Research & Studies'}
        title={title}
        description={description || undefined}
      />

      {/* Category Filtering Tabs */}
      {categories.length > 1 && (
        <div className="-mt-2 flex justify-center">
          <FilterTabs
            ariaLabel={isAr ? 'تصفية الأبحاث حسب الفئة' : 'Filter research by category'}
            options={filterOptions}
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="justify-center"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد أبحاث' : 'No research found'}
          message={isAr ? 'لا توجد أبحاث منشورة حالياً.' : 'No research articles found.'}
          icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
          minHeight={240}
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.div
                layout
                key={item.id || idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ResearchCard research={item} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
      <Container>{inner}</Container>
    </section>
  )
}

export default ResearchGridSection
