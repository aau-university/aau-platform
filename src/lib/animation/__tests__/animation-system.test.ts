import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  animationPresets,
  defaultViewport,
  reducedMotionEffects,
  transitions,
} from '@/lib/animation'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../..')

describe('animation and theme systems', () => {
  it('exposes shared animation primitives for all sections', () => {
    expect(animationPresets.fadeUp.hidden).toEqual({ opacity: 0, y: 16 })
    expect(animationPresets.stagger.visible).toMatchObject({
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    })
    expect(transitions.section).toMatchObject({ duration: 0.4, ease: 'easeOut' })
    expect(defaultViewport).toEqual({ once: true, margin: '-100px' })
    expect(reducedMotionEffects.ambientOrbPrimary.animate).toEqual({ scale: 1, opacity: 0.3 })
  })

  it('loads centralized frontend theme files from the public stylesheet', () => {
    for (const file of ['tokens.css', 'theme.css', 'utilities.css', 'animations.css']) {
      expect(existsSync(path.join(repoRoot, 'src/styles', file))).toBe(true)
    }

    const stylesheet = readFileSync(
      path.join(repoRoot, 'src/app/(frontend)/styles.css'),
      'utf8',
    )

    expect(stylesheet).toContain("@import '../../styles/tokens.css';")
    expect(stylesheet).toContain("@import '../../styles/theme.css';")
    expect(stylesheet).toContain("@import '../../styles/utilities.css';")
    expect(stylesheet).toContain("@import '../../styles/animations.css';")
  })

  it('keeps home section motion on shared primitives', () => {
    const files = [
      'src/blocks/HeroBlock/Component.tsx',
      'src/blocks/AdmissionCTABlock/Component.tsx',
      'src/blocks/CollegesGridBlock/Component.tsx',
      'src/blocks/StatsBlock/Component.tsx',
      'src/blocks/NewsGridBlock/Component.tsx',
      'src/blocks/ContactInfoBlock/Component.tsx',
      'src/components/ui/SectionHeader.tsx',
    ]

    const offenders = files.flatMap((file) => {
      const source = readFileSync(path.join(repoRoot, file), 'utf8')
      const hasInlineInitial = /initial=\{\{/.test(source)
      const hasInlineAnimate = /animate=\{\{/.test(source)
      const hasInlineTransition = /transition=\{\{/.test(source)
      return hasInlineInitial || hasInlineAnimate || hasInlineTransition ? [file] : []
    })

    expect(offenders).toEqual([])
  })
})
