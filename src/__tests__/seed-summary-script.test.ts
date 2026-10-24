import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

function runSummary(created: number): void {
  const directory = mkdtempSync(path.join(tmpdir(), 'aau-seed-summary-'))
  temporaryDirectories.push(directory)
  const log = path.join(directory, 'seed.log')
  writeFileSync(
    log,
    `INFO: Seed completed\n    conflict: 3\n    created: ${created}\n    skipped: 183\n    updated: 0\n`,
  )
  execFileSync(process.execPath, ['scripts/assert-seed-summary.mjs', log], {
    cwd: process.cwd(),
    stdio: 'pipe',
  })
}

describe('Docker seed-summary assertion', () => {
  it('accepts an exact zero created count', () => {
    expect(() => runSummary(0)).not.toThrow()
  })

  it.each([1, 10, 20, 100])('rejects a non-zero created count (%s)', (created) => {
    expect(() => runSummary(created)).toThrow()
  })
})
