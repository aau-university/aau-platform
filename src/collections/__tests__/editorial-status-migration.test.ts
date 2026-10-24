import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { AcademicDepartments } from '@/collections/AcademicDepartments'
import { AcademicPrograms } from '@/collections/AcademicPrograms'
import { Colleges } from '@/collections/Colleges'
import { FacultyMembers } from '@/collections/FacultyMembers'
import { Partners } from '@/collections/Partners'
import { Sliders } from '@/collections/Sliders'
import { StudyPlans } from '@/collections/StudyPlans'
import { TeamMembers } from '@/collections/TeamMembers'
import config from '@/payload.config'

/**
 * The five college-scoped collections that moved from a hand-rolled `isActive`
 * checkbox to Payload's `_status` draft workflow.
 */
const MIGRATED: CollectionConfig[] = [
  Colleges,
  AcademicPrograms,
  AcademicDepartments,
  StudyPlans,
  FacultyMembers,
]

/**
 * Deliberately NOT migrated. Each carries a comment saying so: they are
 * non-editorial list collections with no slug and no detail page, where a plain
 * visibility checkbox is the right model.
 */
const KEEPS_IS_ACTIVE: CollectionConfig[] = [Partners, Sliders, TeamMembers]

function fieldNames(collection: CollectionConfig): (string | undefined)[] {
  return collection.fields.map((field: Field) => ('name' in field ? field.name : undefined))
}

describe('editorial collections use Payload _status', () => {
  it('enables the draft workflow on all five', () => {
    for (const collection of MIGRATED) {
      const versions = collection.versions
      expect(typeof versions, `${collection.slug} versions`).toBe('object')
      expect((versions as { drafts?: unknown }).drafts, `${collection.slug} drafts`).toBeTruthy()
    }
  })

  it('removes the hand-rolled isActive checkbox from all five', () => {
    // Keeping both would be two sources of truth for one question, which is the
    // shape of bug that had a `_status` filter pointed at a collection with no
    // such field (A-02) and left the study-plans block silently empty.
    for (const collection of MIGRATED) {
      expect(fieldNames(collection), `${collection.slug}`).not.toContain('isActive')
    }
  })

  it('leaves the non-editorial list collections on isActive', () => {
    for (const collection of KEEPS_IS_ACTIVE) {
      expect(fieldNames(collection), `${collection.slug}`).toContain('isActive')
      expect(collection.versions, `${collection.slug} versions`).toBeUndefined()
    }
  })

  it('aligns college publication with scoped update access, via a hook not field access', async () => {
    // Payload has no separate publish permission: the admin Publish/Unpublish
    // controls follow collection `update`. Coordinators therefore publish only
    // the college selected by `coordinatorOwnCollegeUpdate`, while the hook
    // rejects roles below coordinator as defense in depth.
    //
    // NOT as field access on `_status`. Payload does not reject a denied field
    // write; it deletes the value and refills it from the stored document, so
    // Publish and Unpublish would report success and do nothing, every autosave
    // of a published college would record its draft as published, and the
    // autosave guard in `revalidatePublicCache` would purge the whole public
    // cache on every tick. See `hooks/restrictPublishToLevel.ts`.
    const resolved = await config
    const colleges = resolved.collections.find((collection) => collection.slug === 'colleges')

    const declaredStatus = Colleges.fields.find(
      (field) => 'name' in field && field.name === '_status',
    )
    expect(declaredStatus, 'colleges must not declare _status with field access').toBeUndefined()

    // Payload still injects it, unguarded, which is what makes the hook necessary.
    const injectedStatus = colleges?.fields.find(
      (field) => 'name' in field && field.name === '_status',
    ) as (Field & { access?: { update?: unknown } }) | undefined
    expect(injectedStatus, 'Payload injects _status when drafts are enabled').toBeDefined()
    expect(injectedStatus?.access?.update).toBeUndefined()

    expect(colleges?.hooks?.beforeChange?.length ?? 0).toBeGreaterThan(0)
  })

  it('defaults new documents to draft', async () => {
    // A behaviour change worth pinning: `isActive` defaulted to `true`, so a new
    // college was public the moment it was created. `_status` defaults to
    // 'draft', which is the point of a draft workflow — and the reason the seed
    // fixtures have to say `published` explicitly.
    const resolved = await config
    for (const collection of MIGRATED) {
      const sanitized = resolved.collections.find((entry) => entry.slug === collection.slug)
      const status = sanitized?.fields.find(
        (field) => 'name' in field && field.name === '_status',
      ) as (Field & { defaultValue?: unknown }) | undefined
      expect(status?.defaultValue, `${collection.slug} _status default`).toBe('draft')
    }
  })
})
