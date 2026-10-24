import { expect } from 'vitest'

export function expectFixtureLeaves(actual: unknown, expected: unknown, path = 'fixture'): void {
  if (expected === null) {
    expect(actual ?? null, path).toBeNull()
    return
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path} must be an array`).toBe(true)
    const actualRows = actual as unknown[]
    expect(actualRows, `${path} row count`).toHaveLength(expected.length)
    expected.forEach((row, index) => expectFixtureLeaves(actualRows[index], row, `${path}[${index}]`))
    return
  }
  if (isRecord(expected)) {
    expect(isRecord(actual), `${path} must be an object`).toBe(true)
    const actualRecord = actual as Record<string, unknown>
    for (const [key, value] of Object.entries(expected)) {
      if (value !== null) {
        expect(
          Object.prototype.hasOwnProperty.call(actualRecord, key),
          `${path}.${key} must exist`,
        ).toBe(true)
      }
      expectFixtureLeaves(actualRecord[key], value, `${path}.${key}`)
    }
    return
  }
  expect(actual, path).toEqual(expected)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
