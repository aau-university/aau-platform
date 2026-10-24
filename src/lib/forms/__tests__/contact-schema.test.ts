import { describe, expect, it } from 'vitest'

import { contactSchema } from '../contact-schema'

const valid = {
  name: 'محمد علي',
  email: 'test@example.com',
  subject: 'استفسار',
  message: 'رسالة تجريبية بطول كافٍ.',
}

describe('contactSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = contactSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it('accepts an optional phone', () => {
    expect(contactSchema.safeParse({ ...valid, phone: '+971501234567' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...valid, phone: '' }).success).toBe(true)
  })

  it('rejects missing required fields', () => {
    expect(contactSchema.safeParse({}).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, email: 'not-email' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, subject: '' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, message: 'short' }).success).toBe(false)
  })

  it('rejects oversized fields', () => {
    expect(contactSchema.safeParse({ ...valid, name: 'A'.repeat(121) }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, message: 'A'.repeat(5001) }).success).toBe(false)
  })

  it('rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, _hp: 'bot' }).success).toBe(false)
  })

  it('accepts an empty honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, _hp: '' }).success).toBe(true)
  })
})
