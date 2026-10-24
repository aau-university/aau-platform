import type { SeedOperations } from '../../lib/local-api'
import { assertUniqueRootDocumentIds } from '../helpers'

export async function resolveTeamMemberIds(
  operations: SeedOperations,
  slugs: readonly string[],
): Promise<number[]> {
  const ids: number[] = []
  for (const slug of slugs) {
    const result = await operations.find({
      collection: 'team-members',
      depth: 0,
      limit: 2,
      locale: 'ar',
      where: { slug: { equals: slug } },
    })
    assertUniqueRootDocumentIds(result.docs, `team-members dependency "${slug}"`)
    const doc = result.docs[0]
    if (result.totalDocs !== 1 || result.docs.length !== 1 || !doc || doc.slug !== slug) {
      throw new Error(`Missing or ambiguous team-members dependency: ${slug}`)
    }
    assertRelationshipId(doc.id, `team-members dependency "${slug}"`)
    ids.push(doc.id)
  }
  return ids
}

function assertRelationshipId(id: unknown, context: string): asserts id is number {
  if (typeof id !== 'number' || !Number.isSafeInteger(id)) {
    throw new Error(`Cannot safely resolve ${context}: invalid relationship ID.`)
  }
}
