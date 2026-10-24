import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const removedPaths = [
  'scripts/fix-nav-arabic-labels.ts',
  'scripts/reset-and-seed.ts',
  'scripts/run-seed.ts',
  'scripts/seed-site-settings.ts',
  'src/app/(frontend)/next/seed/index.ts',
  'src/seed/home-layout.ts',
  'src/seed/index.ts',
  'src/seed/phase-1-5-public-cms.ts',
  'src/seed/v2-02-content.ts',
]

describe('seed entrypoint consolidation', () => {
  it('keeps obsolete implementations and scripts removed', () => {
    for (const path of removedPaths) expect(existsSync(join(ROOT, path)), path).toBe(false)
    const legacyHttpStages = join(ROOT, 'src/app/(frontend)/next/seed/_lib')
    if (existsSync(legacyHttpStages)) expect(readdirSync(legacyHttpStages)).toEqual([])
  })

  it('keeps both supported adapters on the canonical orchestrator', () => {
    expect(readFileSync(join(ROOT, 'src/seed/run.ts'), 'utf8')).toContain("from './run-seed'")
    expect(
      readFileSync(join(ROOT, 'src/app/(frontend)/next/seed/route.ts'), 'utf8'),
    ).toContain("from '@/seed/run-seed'")
  })
})
