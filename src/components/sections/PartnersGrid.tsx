'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PartnerCard } from '@/components/cards/PartnerCard'
import type { PublicPartnerItem, PublicPartnerType } from '@/lib/payload/get-public-partners'

export interface PartnersGridProps {
  partners: PublicPartnerItem[]
}

type TabType = 'all' | Exclude<PublicPartnerType, null>

export function PartnersGrid({ partners }: PartnersGridProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeTab, setActiveTab] = useState<TabType>('all')

  const tabs: Array<{ value: TabType; label: string }> = [
    { value: 'all', label: isAr ? 'الكل' : 'All' },
    { value: 'local', label: isAr ? 'شركاء محليون' : 'Local Partners' },
    { value: 'international', label: isAr ? 'شركاء دوليون' : 'International' },
  ]

  const filteredPartners = useMemo(() => {
    if (activeTab === 'all') return partners
    return partners.filter((partner) => partner.type === activeTab)
  }, [partners, activeTab])

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-muted/10 to-transparent">
      <Container>
        <SectionHeader
          icon={Handshake}
          badge={isAr ? 'شراكاتنا الاستراتيجية' : 'Strategic Partnerships'}
          title={isAr ? 'شركاء النجاح' : 'Success Partners'}
          description={
            isAr
              ? 'نفخر بالتعاون مع نخبة من المؤسسات الأكاديمية والمهنية الرائدة محلياً وعالمياً.'
              : 'We take pride in collaborating with leading local and international academic and professional institutions.'
          }
        />

        <div className="mb-12 flex justify-center">
          <FilterTabs
            ariaLabel={isAr ? 'تصفية الشركاء حسب النوع' : 'Filter partners by type'}
            options={tabs}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabType)}
            className="justify-center"
          />
        </div>

        {filteredPartners.length === 0 ? (
          <EmptyState
            title={isAr ? 'لا يوجد شركاء' : 'No partners found'}
            message={
              isAr ? 'لا يوجد شركاء في هذا القسم حالياً.' : 'No partners found in this category.'
            }
            icon={<Handshake className="h-12 w-12 text-muted-foreground" />}
            minHeight={240}
          />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
          >
            {filteredPartners.map((partner) => (
              <motion.div
                layout
                key={partner.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <PartnerCard partner={partner} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Container>
    </section>
  )
}

export default PartnersGrid
