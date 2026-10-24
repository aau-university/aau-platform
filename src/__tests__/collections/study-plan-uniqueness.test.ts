import { describe, expect, it } from 'vitest'

import { StudyPlans } from '@/collections/StudyPlans'

describe('StudyPlans one-plan-per-program contract', () => {
  it('uses Payload relationship uniqueness as the database-backed contract', () => {
    const academicProgram = StudyPlans.fields.find(
      (field) => 'name' in field && field.name === 'academicProgram',
    )

    expect(academicProgram).toMatchObject({
      name: 'academicProgram',
      relationTo: 'academic-programs',
      required: true,
      type: 'relationship',
      unique: true,
    })
    expect(StudyPlans.indexes).toEqual([{ fields: ['college'] }])
  })
})
