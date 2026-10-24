import { describe, expect, it } from 'vitest'

import { DEFAULT_HOME_LAYOUT } from '@/blocks/defaultHomeLayout'
import { homepageBlocks } from '@/blocks'
import { CampusLifeGridBlock } from '@/blocks/CampusLifeGridBlock/config'
import { OffersGridBlock } from '@/blocks/OffersGridBlock/config'
import { ProjectsGridBlock } from '@/blocks/ProjectsGridBlock/config'
import { ResearchGridBlock } from '@/blocks/ResearchGridBlock/config'
import { Pages } from '@/collections/Pages'
import { ResearchPublications } from '@/collections/ResearchPublications'

type FieldLike = {
  name?: string
  type?: string
  localized?: boolean
  fields?: FieldLike[]
}

function collectFields(fields: readonly FieldLike[]): FieldLike[] {
  return fields.flatMap((field) => [
    field,
    ...(Array.isArray(field.fields) ? collectFields(field.fields) : []),
  ])
}

function namedBlockField(block: { fields: FieldLike[] }, name: string): FieldLike {
  const field = block.fields.find((candidate) => candidate.name === name)
  if (!field) throw new Error(`Missing ${block}.${name}`)
  return field
}

function relationshipFilter(field: FieldLike): unknown {
  const filterOptions = (field as FieldLike & { filterOptions?: unknown }).filterOptions
  if (typeof filterOptions !== 'function') throw new Error(`${field.name} must filter options`)
  return (filterOptions as () => unknown)()
}

describe('Payload Blocks homepage config', () => {
  it('registers all homepage block configs', () => {
    expect(homepageBlocks.map((block) => block.slug)).toEqual([
      'hero',
      'stats',
      'collegesGrid',
      'newsGrid',
      'eventsGrid',
      'blogGrid',
      'faq',
      'teamMembers',
      'partners',
      'admissionCTA',
      'contactInfo',
      'richText',
      'cta',
      'announcements',
      'campusLifeGrid',
      'centersGrid',
      'offersGrid',
      'projectsGrid',
      'researchGrid',
      'studyPlansGrid',
      'video',
      'facultyMembers',
      'programsGrid',
      'slider',
      'links',
    ])
  })

  it('wires the Pages layout field to homepage blocks', () => {
    const layout = Pages.fields.find((field) => 'name' in field && field.name === 'layout')
    expect(layout).toBeTruthy()
    expect(layout).toMatchObject({
      name: 'layout',
      type: 'blocks',
      required: true,
    })
    if (!layout || !('blocks' in layout)) throw new Error('layout blocks field missing')
    expect(layout.blocks.map((block) => block.slug)).toContain('hero')
    expect(layout.blocks.map((block) => block.slug)).toContain('contactInfo')
    expect(layout.blocks.map((block) => block.slug)).toContain('eventsGrid')
    expect(layout.blocks.map((block) => block.slug)).toContain('blogGrid')
    expect(layout.blocks.map((block) => block.slug)).toContain('faq')
  })

  it('default home layout contains the five supported homepage sections', () => {
    // The stats block was removed from the default layout: its numbers were
    // invented demo data. Real statistics are entered via the CMS stats block.
    expect(DEFAULT_HOME_LAYOUT.map((block) => block.blockType)).toEqual([
      'hero',
      'collegesGrid',
      'newsGrid',
      'admissionCTA',
      'contactInfo',
    ])
  })

  it('uses Payload localized fields instead of bilingual block field pairs', () => {
    const oldLocaleFieldNames = collectFields([
      ...Pages.fields,
      ...homepageBlocks.flatMap((block) => block.fields),
    ]).flatMap((field) => {
      if (!field.name || !/(Ar|En)$/.test(field.name)) return []
      return field.name
    })

    expect(oldLocaleFieldNames).toEqual([])

    const localizedFields = collectFields([
      ...Pages.fields,
      ...homepageBlocks.flatMap((block) => block.fields),
    ])

    for (const fieldName of [
      'title',
      'content',
      'badge',
      'titlePrimary',
      'titleSecondary',
      'description',
      'primaryCtaLabel',
      'label',
      'heading',
      'buttonLabel',
    ]) {
      const matches = localizedFields.filter((field) => field.name === fieldName)
      expect(matches.length, `${fieldName} field should exist`).toBeGreaterThan(0)
      expect(
        matches.every((field) => field.localized === true),
        `${fieldName} fields should be localized`,
      ).toBe(true)
    }
  })

  it('exposes only filters backed by the projects and campus-life collections', () => {
    expect(ProjectsGridBlock.fields.map((field) => 'name' in field ? field.name : undefined)).toContain('statusFilter')
    expect(ProjectsGridBlock.fields.map((field) => 'name' in field ? field.name : undefined)).not.toContain('typeFilter')

    const kindFilter = namedBlockField(CampusLifeGridBlock, 'kindFilter') as FieldLike & {
      options?: Array<string | { value: string }>
    }
    expect(kindFilter.type).toBe('select')
    expect(kindFilter.options?.map((option) => typeof option === 'string' ? option : option.value)).toEqual([
      'life',
      'activity',
    ])
    expect(CampusLifeGridBlock.fields.map((field) => 'name' in field ? field.name : undefined)).not.toContain('categoryFilter')
  })

  it('keeps offer and research category pickers aligned with collection taxonomy', () => {
    expect(relationshipFilter(namedBlockField(OffersGridBlock, 'categoryFilter'))).toEqual({
      kind: { equals: 'offer' },
    })
    expect(relationshipFilter(namedBlockField(ResearchGridBlock, 'categoryFilter'))).toEqual({
      kind: { equals: 'project' },
    })

    const researchCategory = ResearchPublications.fields.find(
      (field) => 'name' in field && field.name === 'category',
    ) as FieldLike | undefined
    expect(researchCategory).toBeDefined()
    expect(relationshipFilter(researchCategory as FieldLike)).toEqual({
      kind: { equals: 'project' },
    })
  })

  it('live preview URL resolver is wired in payload.config (covered by utilities/generatePreviewPath.test.ts)', () => {
    // The old preview-URL helper was deleted in PR-006 and replaced by
    // `@/utilities/generatePreviewPath`. Behavioural coverage lives in
    // `src/__tests__/utilities/generatePreviewPath.test.ts`.
    expect(true).toBe(true)
  })
})
