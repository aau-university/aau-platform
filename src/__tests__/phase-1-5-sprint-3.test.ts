import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { AcademicPrograms } from '@/collections/AcademicPrograms'
import { Colleges } from '@/collections/Colleges'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { News } from '@/collections/News'
import { Pages } from '@/collections/Pages'
import { BlogPosts } from '@/collections/BlogPosts'
import { Events } from '@/collections/Events'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

function namedField(collection: { fields: readonly unknown[] }, name: string) {
  return collection.fields.find((field) => {
    return typeof field === 'object' && field !== null && 'name' in field && field.name === name
  }) as Record<string, unknown> | undefined
}

function fieldNames(collection: { fields: readonly unknown[] }) {
  return collection.fields.flatMap((field) => {
    if (typeof field !== 'object' || field === null || !('name' in field)) return []
    return typeof field.name === 'string' ? [field.name] : []
  })
}

describe('Phase 1.5 Sprint 3 schema hardening', () => {
  it('hardens every routeable slug field as required, unique, and indexed', () => {
    for (const collection of [Colleges, News, AcademicPrograms, FacultyMembers, Events, BlogPosts]) {
      expect(namedField(collection, 'slug'), `${collection.slug}.slug`).toMatchObject({
        name: 'slug',
        type: 'text',
        required: true,
        unique: true,
        index: true,
      })
    }
  })

  it('adds Sprint 3 localized content fields to colleges and academic programs', () => {
    expect(namedField(Colleges, 'admissionRequirements')).toMatchObject({
      name: 'admissionRequirements',
      type: 'richText',
      localized: true,
    })

    expect(namedField(AcademicPrograms, 'applicationSteps')).toMatchObject({
      name: 'applicationSteps',
      type: 'richText',
      localized: true,
    })
    expect(namedField(AcademicPrograms, 'whyProgram')).toMatchObject({
      name: 'whyProgram',
      type: 'richText',
      localized: true,
    })
    expect(namedField(AcademicPrograms, 'highSchoolType')).toMatchObject({
      name: 'highSchoolType',
      type: 'text',
      localized: true,
    })
  })

  it('does not reintroduce manual Ar/En field pairs for Sprint 3 fields', () => {
    for (const collection of [Colleges, AcademicPrograms, FacultyMembers, News]) {
      const legacyPairs = fieldNames(collection).filter((name) => /(Ar|En)$/.test(name))
      expect(legacyPairs, collection.slug).toEqual([])
    }
  })

  it('uses beforeValidate slug hooks on routeable collections', () => {
    // At least one beforeValidate hook (the slug generator) must be
    // registered; collections with a required `college` field also carry
    // `enforceCoordinatorScopeBeforeValidate`, so assert "contains hooks"
    // rather than "exactly one".
    for (const collection of [Colleges, News, AcademicPrograms, FacultyMembers, Events, BlogPosts]) {
      const hooks = collection.hooks?.beforeValidate
      expect(hooks, `${collection.slug}.hooks.beforeValidate`).toBeDefined()
      expect(hooks!.length, `${collection.slug}.hooks.beforeValidate`).toBeGreaterThanOrEqual(1)
      for (const hook of hooks!) {
        expect(hook, `${collection.slug}.hooks.beforeValidate entry`).toEqual(expect.any(Function))
      }
    }
  })

  it('reserves public route slugs on Pages before the CMS catch-all is enabled', () => {
    const slugField = namedField(Pages, 'slug')
    expect(slugField?.validate).toEqual(expect.any(Function))

    const validate = slugField?.validate as (value: string) => true | string | Promise<true | string>
    expect(validate('about')).not.toBe(true)
    expect(validate('faculty')).not.toBe(true)
    expect(validate('custom-page')).toBe(true)
  })

  it('registers academic programs and faculty members with the SEO plugin', () => {
    // PR-010 moved all plugin configs (including the SEO plugin's
    // `collections: ['pages', 'news', ...]` array) out of `payload.config.ts`
    // into `src/plugins/index.ts`. The assertion now reads the plugins module.
    const pluginsSource = readFileSync(path.join(repoRoot, 'src/plugins/index.ts'), 'utf8')
    expect(pluginsSource).toMatch(
      /collections:\s*\['pages', 'news', 'colleges', 'events', 'blog-posts', 'academic-programs', 'faculty-members'\]/,
    )
  })
})

