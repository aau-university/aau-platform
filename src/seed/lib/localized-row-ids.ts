export interface RowIdGraftField {
  discriminatorField?: string
  keyField?: string
  rows?: RowIdGraftSchema
}

export type RowIdGraftSchema = Record<string, RowIdGraftField>
export type RowIdGraftMode = 'reset' | 'strict'

export interface RowIdGraftOptions {
  mode?: RowIdGraftMode
}

export class UnsafeLocalizedRowTopologyError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot safely graft localized row IDs at "${path}": ${reason}`)
    this.name = 'UnsafeLocalizedRowTopologyError'
  }
}

export function graftLocalizedRowIds<TPersisted extends object, TTarget extends object>(
  persisted: TPersisted,
  localized: TTarget,
  schema: RowIdGraftSchema,
  options: RowIdGraftOptions = {},
): TTarget {
  return graftObject(
    persisted as Record<string, unknown>,
    localized as Record<string, unknown>,
    schema,
    '',
    options.mode ?? 'strict',
  ) as TTarget
}

function graftObject(
  persisted: Record<string, unknown> | undefined,
  localized: Record<string, unknown>,
  schema: RowIdGraftSchema,
  parentPath: string,
  mode: RowIdGraftMode,
): Record<string, unknown> {
  const result = { ...localized }

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const path = parentPath ? `${parentPath}.${fieldName}` : fieldName
    const localizedValue = localized[fieldName]
    if (localizedValue === undefined) continue
    if (!Array.isArray(localizedValue)) throw unsafe(path, 'localized value is not an array')

    const persistedValue = persisted?.[fieldName]
    if (persistedValue !== undefined && persistedValue !== null && !Array.isArray(persistedValue)) {
      throw unsafe(path, 'persisted value is not an array')
    }

    result[fieldName] = graftRows(
      (persistedValue ?? undefined) as unknown[] | undefined,
      localizedValue,
      fieldSchema,
      path,
      mode,
    )
  }

  return result
}

function graftRows(
  persistedRows: unknown[] | undefined,
  localizedRows: unknown[],
  schema: RowIdGraftField,
  path: string,
  mode: RowIdGraftMode,
): Array<Record<string, unknown>> {
  const targets = localizedRows.map((row, index) => requireRow(row, `${path}[${index}]`))

  if (targets.length === 0 && (!persistedRows || persistedRows.length === 0)) return []
  if (targets.length === 0 && mode === 'reset') return []

  if (!persistedRows) {
    if (mode === 'strict' || !schema.keyField) {
      throw unsafe(path, 'persisted row array is missing')
    }
    return targets.map((target, index) =>
      graftObject(undefined, target, schema.rows ?? {}, `${path}[${index}]`, mode),
    )
  }

  const sources = persistedRows.map((row, index) => requireRow(row, `${path}[${index}]`))
  const persistedIds = new Set<string | number>()
  for (const [index, source] of sources.entries()) {
    const id = source.id
    if (!isValidPersistedRowId(id)) {
      throw unsafe(`${path}[${index}]`, 'persisted row has no ID')
    }
    if (persistedIds.has(id)) throw unsafe(path, 'duplicate persisted row ID')
    persistedIds.add(id)
  }
  if (schema.keyField) return graftKeyedRows(sources, targets, schema, path, mode)

  if (!schema.keyField && sources.length !== targets.length) {
    throw unsafe(path, 'unkeyed row counts differ')
  }

  return targets.map((target, index) =>
    graftMatchedRow(sources[index], target, schema, `${path}[${index}]`, mode),
  )
}

function graftKeyedRows(
  sources: Array<Record<string, unknown>>,
  targets: Array<Record<string, unknown>>,
  schema: RowIdGraftField,
  path: string,
  mode: RowIdGraftMode,
): Array<Record<string, unknown>> {
  const keyField = schema.keyField as string
  const sourceByKey = new Map<string | number, Record<string, unknown>>()

  for (const [index, source] of sources.entries()) {
    const key = requireKey(source, keyField, `${path}[${index}]`)
    if (sourceByKey.has(key)) throw unsafe(path, `duplicate persisted key in "${keyField}"`)
    sourceByKey.set(key, source)
  }

  const targetKeys = new Set<string | number>()
  for (const [index, target] of targets.entries()) {
    const key = requireKey(target, keyField, `${path}[${index}]`)
    if (targetKeys.has(key)) throw unsafe(path, `duplicate localized key in "${keyField}"`)
    targetKeys.add(key)
  }

  if (
    mode === 'strict' &&
    (sourceByKey.size !== targetKeys.size ||
      [...sourceByKey.keys()].some((key) => !targetKeys.has(key)))
  ) {
    throw unsafe(path, `key sets differ for "${keyField}"`)
  }

  return targets.map((target, index) => {
    const rowPath = `${path}[${index}]`
    const key = requireKey(target, keyField, rowPath)

    const source = sourceByKey.get(key)
    return source
      ? graftMatchedRow(source, target, schema, rowPath, mode)
      : graftObject(undefined, target, schema.rows ?? {}, rowPath, mode)
  })
}

function graftMatchedRow(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  schema: RowIdGraftField,
  path: string,
  mode: RowIdGraftMode,
): Record<string, unknown> {
  const id = source.id
  if (!isValidPersistedRowId(id)) {
    throw unsafe(path, 'persisted row has no ID')
  }

  const discriminator = schema.discriminatorField ?? 'blockType'
  if (
    (source[discriminator] !== undefined || target[discriminator] !== undefined) &&
    source[discriminator] !== target[discriminator]
  ) {
    throw unsafe(path, `row discriminator "${discriminator}" differs`)
  }

  return {
    ...graftObject(source, target, schema.rows ?? {}, path, mode),
    id,
  }
}

function requireRow(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw unsafe(path, 'row is not an object')
  }
  return value as Record<string, unknown>
}

function requireKey(row: Record<string, unknown>, keyField: string, path: string): string | number {
  const key = row[keyField]
  if (typeof key !== 'string' && typeof key !== 'number') {
    throw unsafe(path, `row has no scalar "${keyField}" key`)
  }
  return key
}

function isValidPersistedRowId(value: unknown): value is string | number {
  return (
    (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  )
}

function unsafe(path: string, reason: string): UnsafeLocalizedRowTopologyError {
  return new UnsafeLocalizedRowTopologyError(path, reason)
}
