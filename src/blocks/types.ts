import type { Page } from '@/payload-types'

export type PageLayoutBlock = NonNullable<Page['layout']>[number]

export type HeroLayoutBlock = Extract<PageLayoutBlock, { blockType: 'hero' }>
export type StatsLayoutBlock = Extract<PageLayoutBlock, { blockType: 'stats' }>
export type CollegesGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'collegesGrid' }>
export type NewsGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'newsGrid' }>
export type EventsGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'eventsGrid' }>
export type BlogGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'blogGrid' }>
export type FAQLayoutBlock = Extract<PageLayoutBlock, { blockType: 'faq' }>
export type TeamMembersLayoutBlock = Extract<PageLayoutBlock, { blockType: 'teamMembers' }>
export type PartnersLayoutBlock = Extract<PageLayoutBlock, { blockType: 'partners' }>
export type AdmissionCTALayoutBlock = Extract<PageLayoutBlock, { blockType: 'admissionCTA' }>
export type ContactInfoLayoutBlock = Extract<PageLayoutBlock, { blockType: 'contactInfo' }>
export type RichTextLayoutBlock = Extract<PageLayoutBlock, { blockType: 'richText' }>
export type CTALayoutBlock = Extract<PageLayoutBlock, { blockType: 'cta' }>
export type AnnouncementsLayoutBlock = Extract<PageLayoutBlock, { blockType: 'announcements' }>
export type CampusLifeGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'campusLifeGrid' }>
export type CentersGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'centersGrid' }>
export type OffersGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'offersGrid' }>
export type ProjectsGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'projectsGrid' }>
export type ResearchGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'researchGrid' }>
export type StudyPlansGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'studyPlansGrid' }>
export type VideoLayoutBlock = Extract<PageLayoutBlock, { blockType: 'video' }>
export type FacultyMembersLayoutBlock = Extract<PageLayoutBlock, { blockType: 'facultyMembers' }>
export type ProgramsGridLayoutBlock = Extract<PageLayoutBlock, { blockType: 'programsGrid' }>
export type SliderLayoutBlock = Extract<PageLayoutBlock, { blockType: 'slider' }>
export type LinksLayoutBlock = Extract<PageLayoutBlock, { blockType: 'links' }>

