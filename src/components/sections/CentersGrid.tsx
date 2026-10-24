'use client'

import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CenterCard } from '@/components/cards/CenterCard'
import { useLanguage } from '@/i18n/LanguageProvider'
import { animationPresets, defaultViewport } from '@/lib/animation'
import type { PublicCenterItem } from '@/lib/payload/get-public-centers'
import type { HomeSectionText } from '@/lib/payload/get-home-data'

export interface CentersGridSectionProps {
  items: PublicCenterItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

type TabType = 'all' | 'center' | 'service' | 'universityCenter'

export function CentersGridSection({
  items,
  sectionContent,
  disableInnerContainer = false,
}: CentersGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [activeTab, setActiveTab] = useState<TabType>('all')

  const title =
    sectionContent?.title || (isAr ? 'المراكز والخدمات الجامعية' : 'University Centers & Services')
  const description = sectionContent?.description

  // Filter items based on active tab
  const filteredItems =
    activeTab === 'all' ? items : items.filter((item) => item.kind === activeTab)

  const tabs: { value: TabType; label: string }[] = [
    { value: 'all', label: isAr ? 'الكل' : 'All' },
    { value: 'center', label: isAr ? 'مراكز متخصصة' : 'Specialized Centers' },
    { value: 'universityCenter', label: isAr ? 'مراكز جامعية' : 'University Centers' },
    { value: 'service', label: isAr ? 'خدمات' : 'Services' },
  ]

  const Wrapper = disableInnerContainer ? Fragment : Container

  const inner = (
    <div className="flex flex-col gap-8">
      <SectionHeader
        icon={Building2}
        badge={isAr ? 'مراكزنا' : 'Our Centers'}
        title={title}
        description={description || undefined}
      />

      {/* Filter Tabs */}
      {items.length > 0 && (
        <FilterTabs
          ariaLabel={
            isAr ? 'تصفية المراكز والخدمات حسب النوع' : 'Filter centers and services by type'
          }
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
          icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
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
              <CenterCard center={item} isAr={isAr} />
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
export default CentersGridSection
