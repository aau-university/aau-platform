/**
 * Tests for the `redirectsPlugin` wiring (Issue #31).
 *
 * These tests apply the exported plugin array to a minimal config and verify
 * that the official collection has AAU access, routing, and cache hooks.
 */

import { describe, expect, it } from 'vitest'
import type { Config, CollectionConfig } from 'payload'

import { plugins } from '@/plugins'
import { ROUTED_COLLECTION_SLUGS } from '@/utilities/collectionRoutes'
import {
  revalidateRedirectsAfterChange,
  revalidateRedirectsAfterDelete,
} from '@/hooks/revalidateRedirects'

/**
 * Apply every plugin in the exported `plugins` array to a minimal incoming
 * config and return the first collection with `slug === 'redirects'` (the
 * collection the redirects plugin auto-creates). Throws if the redirects
 * collection is not generated.
 */
async function resolveRedirectsCollection(): Promise<CollectionConfig> {
  let incoming: Config = { collections: [] } as unknown as Config
  for (const plugin of plugins) {
    if (typeof plugin !== 'function') continue
    const result = (plugin as (c: Config) => Config)(incoming)
    if (result && typeof result === 'object') {
      incoming = result
    }
  }
  const redirects = (incoming.collections ?? []).find((c) => c.slug === 'redirects')
  if (!redirects) {
    throw new Error('redirects plugin did not generate a `redirects` collection')
  }
  return redirects as CollectionConfig
}

describe('redirectsPlugin wiring (Issue #31)', () => {
  it('attaches revalidateRedirectsAfterChange to the redirects collection afterChange hooks', async () => {
    const redirects = await resolveRedirectsCollection()
    const afterChange = (redirects.hooks as CollectionConfig['hooks'])?.afterChange ?? []
    expect(afterChange).toContain(revalidateRedirectsAfterChange)
  })

  it('attaches revalidateRedirectsAfterDelete to the redirects collection afterDelete hooks', async () => {
    const redirects = await resolveRedirectsCollection()
    const afterDelete = (redirects.hooks as CollectionConfig['hooks'])?.afterDelete ?? []
    expect(afterDelete).toContain(revalidateRedirectsAfterDelete)
  })

  it('does not leave the redirects collection without hooks (regression guard)', async () => {
    const redirects = await resolveRedirectsCollection()
    const hooks = (redirects.hooks as CollectionConfig['hooks']) ?? {}
    expect(hooks.afterChange?.length ?? 0).toBeGreaterThan(0)
    expect(hooks.afterDelete?.length ?? 0).toBeGreaterThan(0)
  })

  it('derives reference targets from every routed collection in the central registry', async () => {
    const redirects = await resolveRedirectsCollection()
    const to = redirects.fields.find(
      (field) => 'name' in field && field.name === 'to',
    )
    if (!to || !('fields' in to) || typeof to.fields === 'function') {
      throw new Error('redirects `to` group was not generated')
    }
    const reference = to.fields.find(
      (field) => 'name' in field && field.name === 'reference',
    )
    if (!reference || !('relationTo' in reference)) {
      throw new Error('redirect reference relationship was not generated')
    }

    expect(reference.relationTo).toEqual(expect.arrayContaining([...ROUTED_COLLECTION_SLUGS]))
    expect(reference.relationTo).toHaveLength(ROUTED_COLLECTION_SLUGS.length)
  })

  it.each(['managed', 'managedTargetCollection', 'managedTargetDocumentId', 'managedTargetRouteKey', 'disabled'])(
    'protects the internal %s field from direct writes',
    async (fieldName) => {
      const redirects = await resolveRedirectsCollection()
      const field = redirects.fields.find(
        (candidate) => 'name' in candidate && candidate.name === fieldName,
      )
      if (!field || !('access' in field)) throw new Error(`${fieldName} field missing`)

      expect(await field.access?.create?.({} as never)).toBe(false)
      expect(await field.access?.update?.({} as never)).toBe(false)
    },
  )
})
