/** Normalize a relationship-or-id value to its primitive ID. */
export function relationshipId(value: unknown): string | number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'object') {
    const id = (value as Record<string, unknown>).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}
