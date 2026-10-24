import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  authenticatedOrPublished,
  contentManagerFieldAccess,
  isContentManagerOrAbove,
} from '@/access'
import { AdmissionRequirements } from '@/collections/AdmissionRequirements'
import { Announcements } from '@/collections/Announcements'
import { BlogPosts } from '@/collections/BlogPosts'
import { CampusLife } from '@/collections/CampusLife'
import { Centers } from '@/collections/Centers'
import { FAQs } from '@/collections/FAQs'
import { News } from '@/collections/News'
import { Offers } from '@/collections/Offers'
import { Pages } from '@/collections/Pages'
import { Partners } from '@/collections/Partners'
import { Projects } from '@/collections/Projects'
import { ResearchPublications } from '@/collections/ResearchPublications'
import { Sliders } from '@/collections/Sliders'
import { StudentAffairsDocuments } from '@/collections/StudentAffairsDocuments'

const CONTENT_MANAGER_COLLECTIONS: CollectionConfig[] = [
  AdmissionRequirements,
  BlogPosts,
  CampusLife,
  Centers,
  FAQs,
  Offers,
  Pages,
  Projects,
  ResearchPublications,
  StudentAffairsDocuments,
]

const DISPLAY_ORDER_COLLECTIONS: CollectionConfig[] = [
  AdmissionRequirements,
  Announcements,
  BlogPosts,
  CampusLife,
  Centers,
  News,
  Offers,
  Pages,
  Partners,
  Projects,
  ResearchPublications,
  Sliders,
  StudentAffairsDocuments,
]

function namedField(collection: CollectionConfig, name: string): Field | undefined {
  return collection.fields.find(
    (field): field is Field & { name: string } => 'name' in field && field.name === name,
  )
}

describe('deduplicated editorial config', () => {
  it('uses the identical Content Manager policy for matching collections', () => {
    for (const collection of CONTENT_MANAGER_COLLECTIONS) {
      expect(collection.access?.create, collection.slug).toBe(isContentManagerOrAbove)
      expect(collection.access?.read, collection.slug).toBe(authenticatedOrPublished)
      expect(collection.access?.readVersions, collection.slug).toBe(isContentManagerOrAbove)
      expect(collection.access?.update, collection.slug).toBe(isContentManagerOrAbove)
      expect(collection.access?.delete, collection.slug).toBe(isContentManagerOrAbove)
    }
  })

  it('shares the Content Manager field guard for matching display-order fields', () => {
    for (const collection of DISPLAY_ORDER_COLLECTIONS) {
      const field = namedField(collection, 'displayOrder')
      expect(field, `${collection.slug}.displayOrder`).toBeDefined()
      expect(field && 'access' in field ? field.access?.update : undefined).toBe(
        contentManagerFieldAccess,
      )
    }
  })
})
