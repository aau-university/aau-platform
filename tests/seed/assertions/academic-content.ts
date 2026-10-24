import { expect } from 'vitest'

import { facultyFixtures } from '@/seed/fixtures/faculty'
import { studyPlanFixtures } from '@/seed/fixtures/study-plans'
import {
  blogPostFixtures,
  campusLifeFixtures,
  eventFixtures,
  faqFixtures,
  newsFixtures,
  offerFixtures,
  researchPublicationFixtures,
} from '@/seed/fixtures/content'
import { relationshipId } from '@/seed/stages/helpers'
import {
  draftContracts,
  fixtureDocument,
  type ArabicInventorySnapshot,
  type AssertionSnapshot,
} from './seed-state'

export function assertEditorSentinel(members: ArabicInventorySnapshot['team-members']): void {
  expect(fixtureDocument(members, 'president-hamdan').name).toBe('EDITOR SENTINEL')
}

export function assertLocalizedTopology(snapshot: AssertionSnapshot): void {
  for (const fixture of studyPlanFixtures) {
    const arabic = fixtureDocument(snapshot.ar['study-plans'], fixture.slug)
    const english = fixtureDocument(snapshot.en['study-plans'], fixture.slug)
    const program = fixtureDocument(snapshot.ar['academic-programs'], fixture.programSlug)
    const programCollege = relationshipId(program.college)
    expect(relationshipId(arabic.college), `${fixture.slug}.college.ar`).toBe(programCollege)
    expect(relationshipId(english.college), `${fixture.slug}.college.en`).toBe(programCollege)
    expect(arabic.courses?.map(({ id }) => id)).toEqual(english.courses?.map(({ id }) => id))
    expect(arabic.courses?.map(({ name }) => name)).toEqual(
      fixture.courses.map(({ name }) => name.ar),
    )
    expect(english.courses?.map(({ name }) => name)).toEqual(
      fixture.courses.map(({ name }) => name.en),
    )
    expect(arabic.courses?.every(({ semester }) => typeof semester === 'string')).toBe(true)
  }

  for (const fixture of facultyFixtures) {
    const arabic = fixtureDocument(snapshot.ar['faculty-members'], fixture.slug)
    const english = fixtureDocument(snapshot.en['faculty-members'], fixture.slug)
    for (const field of ['education', 'experience', 'publications', 'courses', 'skills'] as const) {
      expect(
        arabic[field]?.map(({ id }) => id),
        `${fixture.slug}.${field}`,
      ).toEqual(english[field]?.map(({ id }) => id))
    }
    expect(arabic.fullName).toBe(fixture.fullName.ar)
    expect(english.fullName).toBe(fixture.fullName.en)
  }
}

export function assertContentLocalizedTopology(snapshot: AssertionSnapshot): void {
  for (const fixture of newsFixtures) {
    const arabic = fixtureDocument(snapshot.ar.news, fixture.slug)
    const english = fixtureDocument(snapshot.en.news, fixture.slug)
    expect(arabic._status).toBe('published')
    expect(english._status).toBe('published')
    expect(arabic.tags?.map(({ id }) => id)).toEqual(english.tags?.map(({ id }) => id))
    expect(arabic.tags?.map(({ tag }) => tag) ?? []).toEqual(fixture.ar.tags)
    expect(english.tags?.map(({ tag }) => tag) ?? []).toEqual(fixture.en.tags)
    expect(arabic.publishedAt).toBe(fixture.shared.publishedAt)
    expect(arabic.populatedAuthors).toEqual([])
    expect(english.populatedAuthors).toEqual([])
  }

  for (const fixture of blogPostFixtures) {
    const arabic = fixtureDocument(snapshot.ar['blog-posts'], fixture.slug)
    const english = fixtureDocument(snapshot.en['blog-posts'], fixture.slug)
    expect(arabic._status).toBe('published')
    expect(arabic.tags?.map(({ id }) => id)).toEqual(english.tags?.map(({ id }) => id))
    expect(arabic.tags?.map(({ tag }) => tag)).toEqual(fixture.tags.map(({ ar }) => ar))
    expect(english.tags?.map(({ tag }) => tag)).toEqual(fixture.tags.map(({ en }) => en))
    expect(arabic.publishedAt).toBe(fixture.shared.publishedAt)
    expect(arabic.populatedAuthors).toEqual([])
    expect(english.populatedAuthors).toEqual([])
  }

  for (const fixture of researchPublicationFixtures) {
    const arabic = fixtureDocument(snapshot.ar['research-publications'], fixture.slug)
    const english = fixtureDocument(snapshot.en['research-publications'], fixture.slug)
    expect(arabic._status).toBe('published')
    expect(arabic.tags?.map(({ id }) => id)).toEqual(english.tags?.map(({ id }) => id))
    expect(arabic.tags?.map(({ tag }) => tag)).toEqual(fixture.ar.tags)
    expect(english.tags?.map(({ tag }) => tag)).toEqual(fixture.en.tags)
    expect(arabic.publishDate).toBe(fixture.shared.publishDate)
  }

  for (const fixture of campusLifeFixtures) {
    const arabic = fixtureDocument(snapshot.ar['campus-life'], fixture.slug)
    const english = fixtureDocument(snapshot.en['campus-life'], fixture.slug)
    expect(arabic._status).toBe('published')
    expect(arabic.highlights?.map(({ id }) => id)).toEqual(english.highlights?.map(({ id }) => id))
    expect(arabic.stats?.map(({ id }) => id)).toEqual(english.stats?.map(({ id }) => id))
    expect(arabic.highlights?.map(({ highlight }) => highlight)).toEqual(fixture.ar.highlights)
    expect(english.highlights?.map(({ highlight }) => highlight)).toEqual(fixture.en.highlights)
    expect(arabic.stats ?? []).toEqual([])
    expect(english.stats ?? []).toEqual([])
  }

  for (const fixture of offerFixtures) {
    const arabic = fixtureDocument(snapshot.ar.offers, fixture.slug)
    const english = fixtureDocument(snapshot.en.offers, fixture.slug)
    expect(arabic._status).toBe('published')
    expect(arabic.validUntil ?? null).toBeNull()
    expect(arabic.interestHighlights?.map(({ id }) => id)).toEqual(
      english.interestHighlights?.map(({ id }) => id),
    )
    expect(arabic.interestHighlights?.map(({ highlight }) => highlight) ?? []).toEqual(
      fixture.ar.interestHighlights,
    )
    expect(english.interestHighlights?.map(({ highlight }) => highlight) ?? []).toEqual(
      fixture.en.interestHighlights,
    )
  }
}

export function assertDraftStatusAndDates(snapshot: AssertionSnapshot): void {
  for (const [collection, dateField] of draftContracts) {
    for (const locale of ['ar', 'en'] as const) {
      const collectionSnapshot = snapshot[locale][collection]
      for (const doc of collectionSnapshot.docs) {
        expect(doc._status, `${collection}.${locale}.${doc.id}`).toBe('published')
        if (dateField) {
          expect(typeof Reflect.get(doc, dateField), `${collection}.${dateField}.${doc.id}`).toBe(
            'string',
          )
        }
      }
    }
  }
}

export function assertPersistedParity(snapshot: AssertionSnapshot): void {
  const collegeIds = new Map(
    ['medicine', 'engineering-it'].map((slug) => [
      slug,
      fixtureDocument(snapshot.ar.colleges, slug).id,
    ]),
  )
  for (const fixture of eventFixtures) {
    const event = fixtureDocument(snapshot.ar.events, fixture.slug)
    expect(event.displayOrder ?? null, fixture.slug).toBeNull()
    if (fixture.collegeSlug) {
      expect(relationshipId(event.college), fixture.slug).toBe(collegeIds.get(fixture.collegeSlug))
    }
  }
  for (const fixture of blogPostFixtures) {
    expect(fixtureDocument(snapshot.ar['blog-posts'], fixture.slug).displayOrder ?? null).toBeNull()
  }
  for (const fixture of faqFixtures) {
    expect(fixtureDocument(snapshot.ar.faqs, fixture.slug).displayOrder).toBe(
      fixture.shared.displayOrder,
    )
  }
  for (const fixture of newsFixtures) {
    if ('collegeSlug' in fixture) {
      expect(relationshipId(fixtureDocument(snapshot.ar.news, fixture.slug).college)).toBe(
        collegeIds.get(fixture.collegeSlug),
      )
    }
  }
}
