import type { Where } from 'payload'

/** Public visibility constraint for collections using Payload drafts. */
export const PUBLISHED_WHERE: Where = { _status: { equals: 'published' } }

/** Public visibility constraint reached through a relationship path. */
export function publishedRelation(relationField: string): Where {
  return { [`${relationField}._status`]: { equals: 'published' } }
}

/**
 * Requires the document and every listed parent relationship to be published.
 *
 * Relationship access does not automatically hide a published child whose
 * parent is a draft, so public reads must express the whole publication chain.
 */
export function publishedWithRelations(...relationFields: string[]): Where {
  const uniqueRelations = [...new Set(relationFields)]
  if (uniqueRelations.length === 0) return PUBLISHED_WHERE

  return {
    and: [PUBLISHED_WHERE, ...uniqueRelations.map(publishedRelation)],
  }
}
