import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Field } from 'payload'

import config from '@/payload.config'
import { Colleges } from '@/collections/Colleges'
import { News } from '@/collections/News'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

type NamedField = Field & {
  name?: string
  required?: boolean
  unique?: boolean
  index?: boolean
}

function isNamedField(field: Field): field is NamedField {
  return 'name' in field
}

function getNamedField(fields: readonly Field[], name: string) {
  return fields.find((field): field is NamedField => isNamedField(field) && field.name === name)
}

describe('Phase 1.5 Sprint 0 guardrails', () => {
  it('get-home-data keeps only shared types — the legacy loader is gone', () => {
    const source = readRepoFile('src/lib/payload/get-home-data.ts')

    // The dead getHomeData() aggregate loader (and with it the last consumer
    // of the removed hardcoded demo data) must not come back.
    // Covers every export form: `export function`, `export const`, and
    // named re-exports (`export { getHomeData }` / `export { x as getHomeData }`).
    expect(source).not.toMatch(/export[^\n]*getHomeData/)
    expect(source).toMatch(/HomeSectionText/)
    expect(source).toMatch(/legacy/i)
    expect(source).toMatch(/getPublicPageBySlug|get-public-page/i)
  })

  it('documents production-only guards for PAYLOAD_SECRET and PAYLOAD_DB_PUSH', () => {
    const source = readRepoFile('src/payload.config.ts')

    expect(source).toMatch(/PAYLOAD_SECRET must not be .*production/i)
    expect(source).toMatch(/PAYLOAD_DB_PUSH must not be true in production/i)
    expect(source).toMatch(/local development/i)
  })

  it('keeps live preview and drafts enabled for pages', async () => {
    const resolved = await config

    const pages = resolved.collections?.find((collection) => collection.slug === 'pages')
    expect(pages?.versions?.drafts).toBeTruthy()

    // Live Preview moved from the root `admin.livePreview.collections: ['pages']`
    // block onto each collection via `collectionPreview()`. The root block
    // supplied no `admin.preview`, so Pages had the editor iframe but no way to
    // open the real page; the per-collection helper wires both, and gets their
    // two different argument shapes right.
    expect(typeof pages?.admin?.livePreview?.url).toBe('function')
    expect(typeof pages?.admin?.preview).toBe('function')
  })

  it('confirms colleges/news slug policy after Sprint 3 hardening', () => {
    const collegeSlug = getNamedField(Colleges.fields, 'slug')
    const newsSlug = getNamedField(News.fields, 'slug')

    expect(collegeSlug).toMatchObject({
      name: 'slug',
      required: true,
      unique: true,
      index: true,
    })
    expect(newsSlug).toMatchObject({
      name: 'slug',
      required: true,
      unique: true,
      index: true,
    })
  })
})
