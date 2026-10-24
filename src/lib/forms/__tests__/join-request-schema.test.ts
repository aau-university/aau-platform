import { describe, expect, it } from 'vitest'

import { joinRequestSchema } from '../join-request-schema'

const valid = {
  fullName: 'فاطمة محمد',
  email: 'fatima@example.com',
  phone: '+971501234567',
}

describe('joinRequestSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(joinRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects missing required fields', () => {
    expect(joinRequestSchema.safeParse({}).success).toBe(false)
    expect(joinRequestSchema.safeParse({ ...valid, fullName: '' }).success).toBe(false)
    expect(joinRequestSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false)
    expect(joinRequestSchema.safeParse({ ...valid, phone: 'abc' }).success).toBe(false)
  })

  it('accepts a numeric GPA or a numeric string', () => {
    expect(
      joinRequestSchema.safeParse({ ...valid, highSchoolGpa: 92.5 }).success,
    ).toBe(true)
    const r = joinRequestSchema.safeParse({ ...valid, highSchoolGpa: '92.5' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.highSchoolGpa).toBe(92.5)
  })

  it('rejects out-of-range GPA', () => {
    expect(joinRequestSchema.safeParse({ ...valid, highSchoolGpa: -1 }).success).toBe(false)
    expect(
      joinRequestSchema.safeParse({ ...valid, highSchoolGpa: 1000 }).success,
    ).toBe(false)
    expect(joinRequestSchema.safeParse({ ...valid, highSchoolGpa: '1000' }).success).toBe(false)
  })

  it('rejects an invalid date format', () => {
    expect(
      joinRequestSchema.safeParse({ ...valid, dateOfBirth: '01/01/2000' }).success,
    ).toBe(false)
    expect(
      joinRequestSchema.safeParse({ ...valid, dateOfBirth: '2000-01-01' }).success,
    ).toBe(true)
  })

  it('rejects a filled honeypot', () => {
    expect(joinRequestSchema.safeParse({ ...valid, _hp: 'bot' }).success).toBe(false)
  })

  it('accepts gender enum and rejects others', () => {
    expect(joinRequestSchema.safeParse({ ...valid, gender: 'male' }).success).toBe(true)
    expect(joinRequestSchema.safeParse({ ...valid, gender: 'female' }).success).toBe(true)
    expect(joinRequestSchema.safeParse({ ...valid, gender: 'other' }).success).toBe(false)
  })

  it('normalizes valid relationship IDs and rejects invalid IDs', () => {
    const parsed = joinRequestSchema.safeParse({
      ...valid,
      desiredCollege: '9',
      desiredProgram: 12,
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.desiredCollege).toBe(9)
      expect(parsed.data.desiredProgram).toBe(12)
    }
    expect(joinRequestSchema.safeParse({ ...valid, desiredProgram: 'not-an-id' }).success).toBe(
      false,
    )
  })

  it('accepts only supported education statuses', () => {
    expect(joinRequestSchema.safeParse({ ...valid, educationStatus: 'graduate' }).success).toBe(
      true,
    )
    expect(joinRequestSchema.safeParse({ ...valid, educationStatus: 'student' }).success).toBe(
      true,
    )
    expect(joinRequestSchema.safeParse({ ...valid, educationStatus: 'other' }).success).toBe(false)
  })
})
