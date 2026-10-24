import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../')
const source = readFileSync(
  path.join(repoRoot, 'src/app/(frontend)/[slug]/page.tsx'),
  'utf8',
)

describe('generic CMS page composition', () => {
  it('preserves hero and block rendering inside the page composition root', () => {
    expect(source).toContain('<div id="main-content"')
    expect(source).not.toMatch(/<\/?main\b/)
    expect(source).toContain('<RenderHero hero={doc.hero} />')
    expect(source).toMatch(/<RenderBlocks[\s\S]*blocks=\{doc\.layout\}[\s\S]*locale=\{locale\}/)
    expect(source).toContain('readContext={contentReadContext(preview.draft, preview.user)}')
  })

  it('provides a document-title heading when the CMS hero is absent', () => {
    expect(source).toContain('const hasHero = Boolean(doc.hero?.type)')
    expect(source).toContain("const heading = doc.title?.trim() || slug.replaceAll('-', ' ')")
    expect(source).toMatch(/hasHero \? \([\s\S]*<RenderHero[\s\S]*<h1/)
  })

  it('avoids build-time database enumeration and binds drafts to the preview document ID', () => {
    expect(source).not.toMatch(/export\s+(?:async\s+)?function\s+generateStaticParams/)
    expect(source).not.toContain('EMPTY_STATIC_SLUG')
    expect(source).toContain("collection: 'pages'")
    expect(source).toContain('id: preview.documentId')
    expect(source).toContain('draft: true')
    expect(source).toContain('overrideAccess: false')
    expect(source).toContain('user: preview.user')
  })
})
