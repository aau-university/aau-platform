'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { FilterTabs } from '@/components/shared/navigation/FilterTabs'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ProjectCard } from '@/components/cards/ProjectCard'
import type { PublicProjectItem } from '@/lib/payload/get-public-projects'
import type { HomeSectionText } from '@/lib/payload/get-home-data'
import { useLanguage } from '@/i18n/LanguageProvider'

export interface ProjectsGridSectionProps {
  items: PublicProjectItem[]
  sectionContent?: HomeSectionText
  disableInnerContainer?: boolean
}

type ProjectFilter = 'all' | Exclude<PublicProjectItem['projectStatus'], null>

export function ProjectsGridSection({
  items,
  sectionContent,
  disableInnerContainer,
}: ProjectsGridSectionProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeStatus, setActiveStatus] = useState<ProjectFilter>('all')

  const title = sectionContent?.title || (isAr ? 'المشاريع والابتكارات' : 'Projects & Innovations')
  const description = sectionContent?.description

  const statuses: Array<{ value: ProjectFilter; label: string }> = [
    { value: 'all', label: isAr ? 'الكل' : 'All' },
    { value: 'current', label: isAr ? 'الحالية' : 'Active' },
    { value: 'completed', label: isAr ? 'المنتهية' : 'Completed' },
    { value: 'planned', label: isAr ? 'المخطط لها' : 'Planned' },
  ]

  const filteredItems = useMemo(() => {
    if (activeStatus === 'all') return items
    return items.filter((item) => item.projectStatus === activeStatus)
  }, [items, activeStatus])

  const inner = (
    <div className="flex flex-col gap-10">
      <SectionHeader
        icon={FolderOpen}
        badge={isAr ? 'حاضنة الابتكار' : 'Innovation Hub'}
        title={title}
        description={description || undefined}
      />

      <div className="-mt-2 flex justify-center">
        <FilterTabs
          ariaLabel={isAr ? 'تصفية المشاريع حسب الحالة' : 'Filter projects by status'}
          options={statuses}
          value={activeStatus}
          onValueChange={(value) => setActiveStatus(value as ProjectFilter)}
          className="justify-center"
        />
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title={isAr ? 'لا توجد مشاريع' : 'No projects found'}
          message={
            isAr ? 'لا توجد مشاريع في هذا القسم حالياً.' : 'No projects found in this category.'
          }
          icon={<FolderOpen className="h-12 w-12 text-muted-foreground" />}
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
              <ProjectCard project={item} />
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

export default ProjectsGridSection
