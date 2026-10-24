import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../../')
const detailRoutes = [
  'blog/[slug]',
  'campus-life/[slug]',
  'centers/[slug]',
  'events/[slug]',
  'news/[slug]',
  'offers/[slug]',
  'projects-studio/[slug]',
  'research/articles/[slug]',
]
const shellCompositions = [
  'src/app/(frontend)/blog/[slug]/page.tsx',
  'src/components/pages/campus-life-detail/CampusLifeContent.tsx',
  'src/components/pages/center-detail/CenterContent.tsx',
  'src/app/(frontend)/events/[slug]/page.tsx',
  'src/app/(frontend)/news/[slug]/page.tsx',
  'src/app/(frontend)/offers/[slug]/page.tsx',
  'src/app/(frontend)/projects-studio/[slug]/page.tsx',
  'src/app/(frontend)/research/articles/[slug]/page.tsx',
]

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('non-academic detail presentation', () => {
  it('uses the shared detail shell for every content and sidebar composition', () => {
    for (const file of shellCompositions) {
      const source = read(file)

      expect(source, file).toContain('DetailPageShell')
    }
  })

  it('keeps rich text readable and skeletons fluid', () => {
    const detailComponents = [
      'BlogDetailContent.tsx',
      'CampusLifeContent.tsx',
      'CenterContent.tsx',
      'EventDetailContent.tsx',
      'NewsDetailContent.tsx',
      'OfferContent.tsx',
      'ProjectContent.tsx',
      'ResearchContent.tsx',
    ]

    for (const file of detailComponents) {
      const directory = file.replace(/DetailContent|Content/, '').replace('.tsx', '')
      const slug = directory.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const source = read(`src/components/pages/${slug}-detail/${file}`)

      expect(source, file).toContain('max-w-[72ch]')
    }

    for (const route of detailRoutes) {
      const skeleton = read(`src/app/(frontend)/${route}/skeleton.tsx`)

      expect(skeleton, route).toContain('DetailPageShell')
      expect(skeleton, route).not.toContain('w-96')
    }
  })

  it('formats research publication dates with the shared UTC-safe formatter', () => {
    const source = read('src/components/pages/research-detail/ResearchHero.tsx')

    expect(source).toContain("import { formatDateTimeSync } from '@/utilities/formatDateTimeSync'")
    expect(source).toContain('formatDateTimeSync(article.publishDate, locale)')
    expect(source).not.toContain('new Date(')
    expect(source).not.toContain('toLocaleDateString')
  })

  it('scopes continuous sidebar decoration for reduced motion', () => {
    const sidebars = [
      'src/components/pages/center-detail/CenterSidebar.tsx',
      'src/components/pages/campus-life-detail/CampusLifeSidebar.tsx',
    ]

    for (const file of sidebars) {
      const source = read(file)

      expect(source, file).toContain('motion-ambient')
      expect(source, file).toMatch(/motion-ambient[^"']*animate-pulse/)
    }
  })
})
