import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ANSI_ESCAPE = /\u001B\[[0-?]*[ -/]*[@-~]/g
const COUNT_NAMES = ['created', 'updated', 'skipped', 'conflict']

export function readFinalSeedSummary(log) {
  const normalized = log.replace(ANSI_ESCAPE, '')
  const marker = normalized.lastIndexOf('Seed completed')
  if (marker === -1) throw new Error('Seed log does not contain a completed summary.')

  const finalSummary = normalized.slice(marker)
  return Object.fromEntries(
    COUNT_NAMES.map((name) => {
      const match = finalSummary.match(new RegExp(`^\\s*${name}:\\s*(\\d+)\\s*$`, 'm'))
      if (!match) throw new Error(`Seed summary does not contain an exact ${name} count.`)
      return [name, Number(match[1])]
    }),
  )
}

export function assertIdempotentSeedSummary(log) {
  const summary = readFinalSeedSummary(log)
  if (summary.created !== 0) {
    throw new Error(`Second bootstrap created ${summary.created} records; expected exactly 0.`)
  }
  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2]
  if (!path) throw new Error('Usage: node scripts/assert-seed-summary.mjs <seed-log>')
  assertIdempotentSeedSummary(readFileSync(path, 'utf8'))
}
