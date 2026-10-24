import { Fragment } from 'react'

import type { PageLayoutBlock } from '@/blocks/types'
import type { Locale } from '@/i18n/locale'
import type { ContentReadContext } from '@/lib/payload/content-read-context'
import { getPublicSiteSettings } from '@/lib/payload/get-public-site-settings'

// ── Server Components (async — fetch their own data) ──────────────────
import { CollegesSection } from '@/blocks/CollegesGridBlock/Component'
import { NewsSection } from '@/blocks/NewsGridBlock/Component'
import { EventsGridSection_Server } from '@/blocks/EventsGridBlock/Component'
import { BlogGridBlock_Server } from '@/blocks/BlogGridBlock/Component'
import { FAQBlock_Server } from '@/blocks/FAQBlock/Component'
import { TeamMembersSection } from '@/blocks/TeamMembersBlock/Component'
import { FacultyMembersBlock_Server } from '@/blocks/FacultyMembersBlock/Component'
import { ContactCTASection } from '@/blocks/ContactInfoBlock/Component'
import { CampusLifeGridBlock_Server } from '@/blocks/CampusLifeGridBlock/Component'
import { ProjectsGridBlock_Server } from '@/blocks/ProjectsGridBlock/Component'
import { CentersGridBlock_Server } from '@/blocks/CentersGridBlock/Component'
import { OffersGridBlock_Server } from '@/blocks/OffersGridBlock/Component'
import { ResearchGridBlock_Server } from '@/blocks/ResearchGridBlock/Component'
import { AnnouncementsBlock_Server } from '@/blocks/AnnouncementsBlock/Component'
import { StudyPlansGridBlock_Server } from '@/blocks/StudyPlansGridBlock/Component'
import { ProgramsGridBlock_Server } from '@/blocks/ProgramsGridBlock/Component'
import { SliderBlock_Server } from '@/blocks/SliderBlock/Component'
import { LinksBlock_Server } from '@/blocks/LinksBlock/Component'

// ── Server Components (sync — no data fetching needed) ────────────────
import { StatsBlock_Server } from '@/blocks/StatsBlock/Component'
import { PartnersBlock_Server } from '@/blocks/PartnersBlock/Component'
import { AdmissionCTABlock_Server } from '@/blocks/AdmissionCTABlock/Component'
import { VideoBlock_Server } from '@/blocks/VideoBlock/Component'
import { RichTextRenderer } from '@/blocks/RichTextBlock/Component'
import { CTARenderer } from '@/blocks/CTABlock/Component'

// ── Client Component (Hero — no server data needed) ──────────────────
import { HeroSection } from '@/components/sections/HeroSection'

// ─────────────────────────────────────────────────────────────────────
interface RenderBlocksProps {
  blocks?: PageLayoutBlock[] | null
  locale?: Locale
  disableInnerContainer?: boolean
  readContext?: ContentReadContext
}

function blockKey(block: PageLayoutBlock, index: number): string {
  return `${block.blockType}-${block.id ?? index}`
}

/**
 * RenderBlocks — Clean async dispatcher.
 *
 * Each block is a Server Component that fetches its own data.
 * This component only routes `blockType` → the correct component,
 * passing `locale` and `disableInnerContainer` through.
 */
export async function RenderBlocks({
  blocks,
  locale = 'ar',
  disableInnerContainer = false,
  readContext = { draft: false },
}: RenderBlocksProps) {
  if (!blocks || blocks.length === 0) return null

  const rendered = await Promise.all(
    blocks.map(async (block, index) => {
      const key = blockKey(block, index)
      const sharedProps = { locale, disableInnerContainer, readContext }

      switch (block.blockType) {
        case 'hero': {
          const siteSettings = await getPublicSiteSettings(locale)
          return <Fragment key={key}><HeroSection content={block} logo={siteSettings.logo} disableInnerContainer={disableInnerContainer} /></Fragment>
        }
        case 'stats':
          return <Fragment key={key}><StatsBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'collegesGrid':
          return <Fragment key={key}><CollegesSection {...block} {...sharedProps} /></Fragment>
        case 'newsGrid':
          return <Fragment key={key}><NewsSection {...block} {...sharedProps} /></Fragment>
        case 'eventsGrid':
          return <Fragment key={key}><EventsGridSection_Server {...block} {...sharedProps} /></Fragment>
        case 'blogGrid':
          return <Fragment key={key}><BlogGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'faq':
          return <Fragment key={key}><FAQBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'teamMembers':
          return <Fragment key={key}><TeamMembersSection {...block} {...sharedProps} /></Fragment>
        case 'facultyMembers':
          return <Fragment key={key}><FacultyMembersBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'partners':
          return <Fragment key={key}><PartnersBlock_Server {...block} disableInnerContainer={disableInnerContainer} /></Fragment>
        case 'admissionCTA':
          return <Fragment key={key}><AdmissionCTABlock_Server {...block} disableInnerContainer={disableInnerContainer} /></Fragment>
        case 'contactInfo':
          return <Fragment key={key}><ContactCTASection {...block} {...sharedProps} /></Fragment>
        case 'richText':
          return <Fragment key={key}><RichTextRenderer block={block} disableInnerContainer={disableInnerContainer} /></Fragment>
        case 'cta':
          return <Fragment key={key}><CTARenderer block={block} disableInnerContainer={disableInnerContainer} /></Fragment>
        case 'video':
          return <Fragment key={key}><VideoBlock_Server {...block} disableInnerContainer={disableInnerContainer} /></Fragment>
        case 'campusLifeGrid':
          return <Fragment key={key}><CampusLifeGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'projectsGrid':
          return <Fragment key={key}><ProjectsGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'centersGrid':
          return <Fragment key={key}><CentersGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'offersGrid':
          return <Fragment key={key}><OffersGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'researchGrid':
          return <Fragment key={key}><ResearchGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'announcements':
          return <Fragment key={key}><AnnouncementsBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'studyPlansGrid':
          return <Fragment key={key}><StudyPlansGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'programsGrid':
          return <Fragment key={key}><ProgramsGridBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'slider':
          return <Fragment key={key}><SliderBlock_Server {...block} {...sharedProps} /></Fragment>
        case 'links':
          return <Fragment key={key}><LinksBlock_Server {...block} disableInnerContainer={disableInnerContainer} /></Fragment>
        default:
          return null
      }
    }),
  )

  return <>{rendered}</>
}
