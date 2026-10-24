import { announcementFixtures, blogPostFixtures, faqFixtures } from './community'
import { admissionRequirementFixtures, sliderFixtures, studentAffairsDocumentFixtures } from './keyless'
import { offerFixtures, partnerFixtures } from './marketing'
import { eventFixtures, newsFixtures } from './news-events'
import { campusLifeFixtures, researchPublicationFixtures } from './research-campus'
import { centerFixtures, projectFixtures } from './services'
import { teamMemberFixtures } from './team-members'

export const contentFixtureCounts = {
  'admission-requirements': admissionRequirementFixtures.length,
  announcements: announcementFixtures.length,
  'blog-posts': blogPostFixtures.length,
  'campus-life': campusLifeFixtures.length,
  centers: centerFixtures.length,
  events: eventFixtures.length,
  faqs: faqFixtures.length,
  news: newsFixtures.length,
  offers: offerFixtures.length,
  partners: partnerFixtures.length,
  projects: projectFixtures.length,
  'research-publications': researchPublicationFixtures.length,
  sliders: sliderFixtures.length,
  'student-affairs-documents': studentAffairsDocumentFixtures.length,
  'team-members': teamMemberFixtures.length,
} as const
