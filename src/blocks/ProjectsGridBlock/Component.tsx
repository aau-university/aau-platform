import type { PageLayoutBlock } from '@/blocks/types'
import { getPublicProjects } from '@/lib/payload/get-public-projects'
import { ProjectsGridSection } from '@/components/sections/ProjectsGrid'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'

type ProjectsGridBlock = Extract<PageLayoutBlock, { blockType: 'projectsGrid' }>

function clampLimit(n?: number | null, fallback = 6): number {
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

export async function ProjectsGridBlock_Server(props: ProjectsGridBlock & { locale?: Locale; disableInnerContainer?: boolean; readContext?: ContentReadContext }) {
  const { maxItems, locale = 'ar', statusFilter } = props
  const items = await getPublicProjects({
    limit: clampLimit(maxItems),
    locale,
    projectStatus: statusFilter ?? undefined,
    readContext: props.readContext,
  })
  return <ProjectsGridSection items={items} sectionContent={props} disableInnerContainer={props.disableInnerContainer} />
}
