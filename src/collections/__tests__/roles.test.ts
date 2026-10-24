import { describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { Roles } from '../Roles'

describe('Roles collection', () => {
  it('defines the required system role and permission fields', () => {
    const fieldNames = Roles.fields.map((field) => ('name' in field ? field.name : undefined))

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'name',
        'description',
        'slug',
        'level',
        'isSystemRole',
        'permissions',
        'canAccessPayloadAdmin',
        'canAccessRefine',
        'canAccessStudentPortal',
        'canAccessDoctorPortal',
        'isActive',
      ]),
    )
    expect(fieldNames).not.toEqual(
      expect.arrayContaining(['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn']),
    )
  })

  it('is registered in the Payload config collections', async () => {
    const payloadConfig = await config
    const collectionSlugs = payloadConfig.collections?.map((collection) => collection.slug)

    expect(collectionSlugs).toContain('roles')
  })
})
