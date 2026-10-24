import { describe, expect, it } from 'vitest'

import { Users } from '../Users'

interface FieldWithAccess {
  access?: {
    create?: (args?: unknown) => boolean
    update?: (args?: unknown) => boolean
  }
  admin?: {
    hidden?: boolean
  }
  required?: boolean
  saveToJWT?: boolean
  type?: string
}

function getNamedField(name: string) {
  return Users.fields.find((field) => 'name' in field && field.name === name)
}

describe('Users collection', () => {
  it('uses a role relationship and transitional systemRole select', () => {
    const roleField = getNamedField('role')
    const systemRoleField = getNamedField('systemRole')

    expect(roleField).toMatchObject({
      type: 'relationship',
      relationTo: 'roles',
      required: true,
    })
    expect(systemRoleField).toMatchObject({
      type: 'select',
      saveToJWT: true,
    })
  })

  it('has virtual fields for JWT injection', () => {
    const roleSlug = getNamedField('roleSlug') as FieldWithAccess | undefined
    const roleLevel = getNamedField('roleLevel') as FieldWithAccess | undefined
    const rolePermissions = getNamedField('rolePermissions') as FieldWithAccess | undefined
    const roleIsActive = getNamedField('roleIsActive') as FieldWithAccess | undefined
    const roleCanAccessPayloadAdmin = getNamedField('roleCanAccessPayloadAdmin') as FieldWithAccess | undefined

    expect(roleSlug).toMatchObject({ type: 'text', saveToJWT: true })
    expect(roleLevel).toMatchObject({ type: 'number', saveToJWT: true })
    expect(rolePermissions).toMatchObject({ type: 'json', saveToJWT: true })
    expect(roleIsActive).toMatchObject({ type: 'checkbox', saveToJWT: true })
    expect(roleCanAccessPayloadAdmin).toMatchObject({ type: 'checkbox', saveToJWT: true })
    for (const field of [roleSlug, roleLevel, rolePermissions, roleIsActive, roleCanAccessPayloadAdmin]) {
      expect(field?.access?.create).toEqual(expect.any(Function))
      expect(field?.access?.update).toEqual(expect.any(Function))
    }
  })

  it('prevents direct writes to role snapshot fields, even for admins', () => {
    const adminReq = { req: { user: { id: 'admin-1', roleLevel: 5 } } }

    for (const name of ['roleSlug', 'roleLevel', 'rolePermissions', 'roleIsActive', 'roleCanAccessPayloadAdmin']) {
      const field = getNamedField(name) as FieldWithAccess | undefined
      expect(field?.access?.create?.(adminReq)).toBe(false)
      expect(field?.access?.update?.(adminReq)).toBe(false)
    }
  })

  it('deprecates systemRole by removing required flag and hiding it', () => {
    const systemRole = getNamedField('systemRole') as FieldWithAccess | undefined
    expect(systemRole?.required).toBeFalsy()
    expect(systemRole?.admin?.hidden).toBe(true)
  })
})
