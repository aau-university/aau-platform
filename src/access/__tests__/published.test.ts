import { describe, expect, it } from 'vitest'

import { PUBLISHED_WHERE, publishedRelation, publishedWithRelations } from '../published'

describe('public publication constraints', () => {
  it('uses one canonical document publication predicate', () => {
    expect(PUBLISHED_WHERE).toEqual({ _status: { equals: 'published' } })
    expect(publishedWithRelations()).toBe(PUBLISHED_WHERE)
  })

  it('requires every parent relationship to be published', () => {
    expect(publishedWithRelations('college', 'academicProgram')).toEqual({
      and: [
        PUBLISHED_WHERE,
        { 'college._status': { equals: 'published' } },
        { 'academicProgram._status': { equals: 'published' } },
      ],
    })
  })

  it('supports nested ancestors and removes duplicate paths', () => {
    expect(publishedWithRelations('academicProgram.college', 'academicProgram.college')).toEqual({
      and: [PUBLISHED_WHERE, publishedRelation('academicProgram.college')],
    })
  })
})
