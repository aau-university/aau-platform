import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../../../..')

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('homepage Suspense boundary', () => {
  it('wraps homepage content behind a Suspense fallback', () => {
    const source = read('src/app/(frontend)/page.tsx')

    expect(source).toMatch(/import \{[^}]*Suspense[^}]*\} from 'react'/)
    expect(source).toContain("import { HomeSkeleton } from '@/components/common/HomeSkeleton'")
    expect(source).toMatch(/<Suspense\s+fallback=\{<HomeSkeleton\s*\/>\}/)
    expect(source).toContain('<HomeBody searchParams={searchParams} />')
    expect(source).toMatch(/async function HomeBody\(\{ searchParams \}/)
    expect(source).toContain('documentId: preview.documentId ?? undefined')
    expect(source).toContain('readContext={contentReadContext(preview.draft, preview.user)}')
    expect(source).not.toMatch(/<\/?main\b/)
  })

  it('provides a route loading state and reusable skeleton components', () => {
    const files = [
      'src/app/(frontend)/loading.tsx',
      'src/components/common/Skeleton.tsx',
      'src/components/common/HomeSkeleton.tsx',
    ]

    for (const file of files) {
      expect(existsSync(path.join(repoRoot, file)), `${file} should exist`).toBe(true)
    }

    expect(read('src/app/(frontend)/loading.tsx')).toContain('<HomeSkeleton />')
    expect(read('src/components/common/HomeSkeleton.tsx')).toContain('<Skeleton')
  })

  it('keeps request-bound layout data behind a Suspense shell', () => {
    const source = read('src/app/(frontend)/layout.tsx')

    expect(source).toMatch(/import \{[^}]*Suspense[^}]*\} from 'react'/)
    expect(source).toMatch(/export default function RootLayout/)
    expect(source).toMatch(/<Suspense\s+fallback=\{<PublicShellFallback/)
    expect(source).toMatch(/<PublicShell>\s*\{children\}\s*<\/PublicShell>/)
    expect(source).toMatch(/async function PublicShell/)
  })
})
