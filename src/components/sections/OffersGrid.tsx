'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { OfferCard } from '@/components/cards/OfferCard'
import type { PublicOfferItem } from '@/lib/payload/get-public-offers'
import type { HomeSectionText } from '@/lib/payload/get-home-data'
import { useLanguage } from '@/i18n/LanguageProvider'

export interface OffersGridSectionProps {
  items: PublicOfferItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

export function OffersGridSection({
  items,
  sectionContent,
  disableInnerContainer,
}: OffersGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const title = sectionContent?.title || (isAr ? 'العروض والخصومات' : 'Offers & Discounts')
  const description = sectionContent?.description

  // Extract unique categories from items
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
        icon={Gift}
        badge={isAr ? 'حسومات حصرية' : 'Exclusive Offers'}
        title={title}
        description={description || undefined}
      />

      {/* Category Tabs (Show only if there are multiple categories) */}
      {categories.length > 1 && (
        <div className="-mt-2 flex justify-center">
          <FilterTabs
            ariaLabel={isAr ? 'تصفية العروض حسب الفئة' : 'Filter offers by category'}
            options={filterOptions}
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="justify-center"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد عروض' : 'No offers found'}
          message={isAr ? 'لا توجد عروض حالياً.' : 'No offers available at the moment.'}
          icon={<Gift className="h-12 w-12 text-muted-foreground" />}
          minHeight={240}
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <motion.div
              layout
              key={item.id || idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <OfferCard offer={item} />
            </motion.div>
          ))}
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
