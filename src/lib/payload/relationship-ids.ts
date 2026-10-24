export type RelationshipID = string | number

export function normalizeRelationshipIds(values: unknown): RelationshipID[] {
  if (!Array.isArray(values)) return []

  return values.flatMap((value) => {
    if (typeof value === 'string' || typeof value === 'number') return [value]
    if (!value || typeof value !== 'object') return []

    const id = (value as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? [id] : []
  })
}
