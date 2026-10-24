import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../../../')

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('About page presentation', () => {
  it('renders stable localized states for unavailable and unpopulated CMS data', () => {
    const serverSource = read('src/app/(frontend)/about/page.tsx')
    const clientSource = read('src/app/(frontend)/about/page.client.tsx')

    expect(serverSource).toContain('if (!aboutPage) return <AboutPageUnavailable locale={locale} />')
    expect(serverSource).toContain('Content is currently unavailable')
    expect(clientSource).toContain('if (!hasPageContent)')
    expect(clientSource).toContain('Content has not been added to this page yet.')
  })

  it('gives the biography dialog an accessible title and 44px controls', () => {
    const source = read('src/app/(frontend)/about/page.client.tsx')

    expect(source).toContain('<DialogTitle')
    expect(source).toContain('{selectedMember.name}')
    expect(source).toContain('min-h-11')
    expect(source).toContain('[&>button]:h-11 [&>button]:w-11')
  })

  it('leaves the sole main landmark to MainLayout', () => {
    const serverSource = read('src/app/(frontend)/about/page.tsx')
    const clientSource = read('src/app/(frontend)/about/page.client.tsx')

    expect(serverSource).not.toMatch(/<\/?main\b/)
    expect(clientSource).not.toMatch(/<\/?main\b/)
  })
})
