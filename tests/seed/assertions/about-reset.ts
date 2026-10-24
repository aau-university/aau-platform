import { expect } from 'vitest'
import type { Payload } from 'payload'

import { aboutPageFixture } from '@/seed/fixtures/globals'
import { richText } from '@/seed/lib/rich-text'
import { expectFixtureLeaves } from './fixture-match'

export async function corruptAboutForReset(payload: Payload) {
  const [arabic, english] = await Promise.all([
    readAbout(payload, 'ar'),
    readAbout(payload, 'en'),
  ])
  const relationshipIds = (arabic.teamMembersRelationship ?? []).map((value) => {
    const id = relationshipId(value)
    if (typeof id !== 'number') throw new Error('About team relationship must have a numeric ID.')
    return id
  })
  expect(english.id).toBe(arabic.id)

  await payload.updateGlobal({
    slug: 'about-page',
    context: { disableRevalidate: true },
    data: {
      intro: { body: richText('EDITOR ABOUT AR INTRO', 'ar') },
      president: { messageBody: richText('EDITOR ABOUT AR PRESIDENT', 'ar') },
      teamMembers: [
        {
          displayOrder: 999,
          fullName: 'EDITOR INLINE MEMBER',
          groupName: 'EDITOR GROUP',
          jobTitle: 'EDITOR ROLE',
        },
      ],
      teamMembersRelationship: [...relationshipIds].reverse(),
    },
    fallbackLocale: false,
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'about-page',
    context: { disableRevalidate: true },
    data: {
      intro: { body: richText('EDITOR ABOUT EN INTRO', 'en') },
      president: { messageBody: richText('EDITOR ABOUT EN PRESIDENT', 'en') },
    },
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: true,
  })

  return { id: arabic.id, relationshipIds }
}

export async function assertAboutReset(
  payload: Payload,
  expected: Awaited<ReturnType<typeof corruptAboutForReset>>,
): Promise<void> {
  const [arabic, english] = await Promise.all([
    readAbout(payload, 'ar'),
    readAbout(payload, 'en'),
  ])
  expect(arabic.id).toBe(expected.id)
  expect(english.id).toBe(expected.id)
  expectFixtureLeaves(arabic, aboutPageFixture.ar, 'reset.about.ar')
  expectFixtureLeaves(english, aboutPageFixture.en, 'reset.about.en')

  for (const about of [arabic, english]) {
    expect(about.intro?.image ?? null).toBeNull()
    expect(about.president?.image ?? null).toBeNull()
    expect(about.teamMembers).toEqual([])
    expect((about.teamMembersRelationship ?? []).map(relationshipId)).toEqual(
      expected.relationshipIds,
    )
  }
}

function readAbout(payload: Payload, locale: 'ar' | 'en') {
  return payload.findGlobal({
    slug: 'about-page',
    depth: 0,
    fallbackLocale: false,
    locale,
    overrideAccess: true,
  })
}

function relationshipId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}
