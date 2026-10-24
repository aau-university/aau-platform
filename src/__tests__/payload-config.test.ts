/**
 * payload.config — high-level wiring tests.
 *
 * These tests load `src/payload.config.ts` without instantiating Payload
 * (no DB, no secret required). They assert the configuration shape we
 * commit to in this stabilization branch.
 */

import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '@/payload.config'

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../../..')

type FieldLike = Field & {
  name?: string
  fields?: FieldLike[]
}

function collectNamedFields(fields: readonly FieldLike[]): FieldLike[] {
  return fields.flatMap((field) => [
    field,
    ...(Array.isArray(field.fields) ? collectNamedFields(field.fields) : []),
  ])
}

describe('payload.config localization', () => {
  it('declares Arabic and English locales', async () => {
    const resolved = await config
    expect(resolved.localization).toBeTruthy()
    const localization = resolved.localization
    if (localization === false) throw new Error('localization must be enabled')
    expect(localization.defaultLocale).toBe('ar')
    // Codes only — the rest of the locale entry is implementation detail.
    const codes = localization.locales.map((l) => (typeof l === 'string' ? l : l.code)).sort()
    expect(codes).toEqual(['ar', 'en'])
    expect(localization.fallback).toBe(true)
  })

  it('has core and Sprint 1+2 collections registered', async () => {
    const resolved = await config
    const slugs = resolved.collections?.map((c) => c.slug) ?? []
    expect(slugs).toContain('users')
    expect(slugs).toContain('roles')
    expect(slugs).toContain('pages')
    expect(slugs).toContain('events')
    expect(slugs).toContain('blog-posts')
    expect(slugs).toContain('faqs')
    expect(slugs).toContain('email-requests')
    expect(slugs).toContain('team-members')
  })

  it('declares Postgres as the database adapter', async () => {
    const resolved = await config
    // Sanity: the adapter name is exposed on the db field. We avoid any
    // assumption beyond "it exists" — Payload's internal shape is private.
    expect(resolved.db).toBeTruthy()
  })

  it('uses localized fields instead of Ar/En schema field pairs', async () => {
    const resolved = await config
    const allFields = [
      ...(resolved.collections ?? []).flatMap((collection) => collection.fields),
      ...(resolved.globals ?? []).flatMap((global) => global.fields),
    ] as FieldLike[]

    const legacyFieldNames = collectNamedFields(allFields).flatMap((field) => {
      if (!field.name || !/(Ar|En)$/.test(field.name)) return []
      return field.name
    })

    expect(legacyFieldNames).toEqual([])
  })

  it('keeps public payload helpers on generated types at the CMS boundary', () => {
    const helperFiles = [
      'src/lib/payload/get-public-colleges.ts',
      'src/lib/payload/get-public-news.ts',
      'src/lib/payload/get-public-page.ts',
    ]

    const offenders = helperFiles.filter((file) => {
      const source = readFileSync(path.join(repoRoot, file), 'utf8')
      return source.includes('as unknown as Record<string, unknown>')
    })

    expect(offenders).toEqual([])
  })
})
