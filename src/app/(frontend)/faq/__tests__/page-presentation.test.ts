import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../')
const source = readFileSync(
  path.join(repoRoot, 'src/app/(frontend)/faq/page.tsx'),
  'utf8',
)

describe('FAQ page landmarks', () => {
  it('leaves the sole main landmark to MainLayout and retains the labeled FAQ section', () => {
    expect(source).not.toMatch(/<\/?main\b/)
    expect(source).toContain('<div id="main-content"')
    expect(source).toContain('<section aria-labelledby="faq-title"')
  })
})
