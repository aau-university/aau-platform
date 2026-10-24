'use client'

import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CampusLifeCard } from '@/components/cards/CampusLifeCard'
import { useLanguage } from '@/i18n/LanguageProvider'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicCampusLifeItem } from '@/lib/payload/get-public-campus-life'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface CampusLifeGridSectionProps {
  items: PublicCampusLifeItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

type TabType = 'all' | 'life' | 'activity'

export function CampusLifeGridSection({
  items,
  sectionContent,
  disableInnerContainer = false,
}: CampusLifeGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [activeTab, setActiveTab] = useState<TabType>('all')

  const title =
    sectionContent?.title || (isAr ? 'الحياة والأنشطة الجامعية' : 'Campus Life & Activities')
  const description = sectionContent?.description

  const filteredItems =
    activeTab === 'all' ? items : items.filter((item) => item.kind === activeTab)

  const tabs: { value: TabType; label: string }[] = [
    { value: 'all', label: isAr ? 'الكل' : 'All' },
    { value: 'life', label: isAr ? 'الحياة الجامعية' : 'Campus Life' },
    { value: 'activity', label: isAr ? 'الأنشطة والفعاليات' : 'Activities & Events' },
  ]

  const Wrapper = disableInnerContainer ? Fragment : Container

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader
        icon={Sparkles}
        badge={isAr ? 'الحياة الجامعية' : 'Campus Life'}
        title={title}
        description={description || undefined}
      />

      {/* Filter Tabs */}
      {items.length > 0 && (
        <FilterTabs
          ariaLabel={isAr ? 'تصفية الحياة الجامعية حسب النوع' : 'Filter campus life by type'}
          options={tabs}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabType)}
          className="mb-8 justify-center"
        />
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد نتائج' : 'No results found'}
          message={isAr ? 'لا توجد عناصر لعرضها حالياً.' : 'No items found to display.'}
          icon={<Sparkles className="h-12 w-12 text-muted-foreground" />}
          minHeight={240}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={animationPresets.stagger}
        >
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              variants={animationPresets.staggerItem}
              className="h-full"
            >
              <CampusLifeCard item={item} isAr={isAr} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )

  if (disableInnerContainer) return inner

  return (
    <section className="py-16 md:py-24 bg-background">
      <Wrapper>{inner}</Wrapper>
    </section>
  )
}
export default CampusLifeGridSection
