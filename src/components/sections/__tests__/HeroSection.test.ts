import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../')
const source = readFileSync(
  path.join(repoRoot, 'src/components/sections/HeroSection.tsx'),
  'utf8',
)

describe('HeroSection presentation', () => {
  it('keeps a single semantic heading and CMS-backed navigation links', () => {
    expect(source.match(/<motion\.h1/g)).toHaveLength(1)
    expect(source).toContain("<Link href={primaryCtaHref || '/admission'}>")
    expect(source).toContain("<Link href={secondaryCtaHref || '/colleges'}>")
    expect(source).toContain('min-h-11')
  })

  it('uses stable media dimensions and a reduced-motion path without decorative effects', () => {
    expect(source).toContain('className="relative h-24 w-24 sm:h-28 sm:w-28"')
    expect(source).toContain('preload')
    expect(source).toContain("shouldReduceMotion ? 'auto' : 'smooth'")
    expect(source).not.toMatch(/BorderBeam|ShimmerText|<Sparkles/)
  })
})
