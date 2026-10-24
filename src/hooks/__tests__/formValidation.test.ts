import { describe, expect, it } from 'vitest'

import { validateContactMessage, validateJoinRequest } from '../formValidation'

/**
 * Unit tests for public form validation helpers.
 *
 * These helpers are extracted pure functions from the beforeValidate hooks.
 * They validate incoming data and return either `true` (valid) or an error string.
 *
 * Denial/exception cases first per PDCA testing-anti-patterns #7.
 */

describe('validateContactMessage', () => {
  const valid = {
    name: 'محمد علي',
    email: 'test@example.com',
    subject: 'استفسار عام',
    message: 'رسالة تجريبية للتواصل',
    _hp: '', // honeypot must be empty
  }

  // ── Degenerate: completely empty ─────────────────────────────────────────

  it('rejects completely empty payload', () => {
    expect(validateContactMessage({})).not.toBe(true)
  })

  // ── Exception: honeypot filled (bot detection) ───────────────────────────

  it('rejects when honeypot field is filled', () => {
    const data = { ...valid, _hp: 'bot-filled-this' }
    expect(validateContactMessage(data)).not.toBe(true)
  })

  // ── Exception: missing required fields ───────────────────────────────────

  it('rejects missing name', () => {
    const { name: _, ...data } = valid
    expect(validateContactMessage(data)).not.toBe(true)
  })

  it('rejects empty name string', () => {
    expect(validateContactMessage({ ...valid, name: '' })).not.toBe(true)
    expect(validateContactMessage({ ...valid, name: '   ' })).not.toBe(true)
  })

  it('rejects missing email', () => {
    const { email: _, ...data } = valid
    expect(validateContactMessage(data)).not.toBe(true)
  })

  it('rejects malformed email', () => {
    expect(validateContactMessage({ ...valid, email: 'not-an-email' })).not.toBe(true)
    expect(validateContactMessage({ ...valid, email: 'test@' })).not.toBe(true)
  })

  it('rejects missing subject', () => {
    const { subject: _, ...data } = valid
    expect(validateContactMessage(data)).not.toBe(true)
  })

  it('rejects missing message', () => {
    const { message: _, ...data } = valid
    expect(validateContactMessage(data)).not.toBe(true)
  })

  it('rejects message that is too short (< 10 chars)', () => {
    expect(validateContactMessage({ ...valid, message: 'hi' })).not.toBe(true)
  })

  // ── Happy path: valid data ────────────────────────────────────────────────

  it('accepts a valid complete contact message', () => {
    expect(validateContactMessage(valid)).toBe(true)
  })

  it('accepts valid data without honeypot field present at all', () => {
    const { _hp: _, ...data } = valid
    expect(validateContactMessage(data)).toBe(true)
  })
})

describe('validateJoinRequest', () => {
  const valid = {
    fullName: 'فاطمة محمد',
    email: 'fatima@example.com',
    phone: '+971501234567',
    _hp: '',
  }

  // ── Degenerate ────────────────────────────────────────────────────────────

  it('rejects empty payload', () => {
    expect(validateJoinRequest({})).not.toBe(true)
  })

  // ── Honeypot ──────────────────────────────────────────────────────────────

  it('rejects when honeypot is filled', () => {
    expect(validateJoinRequest({ ...valid, _hp: 'spam' })).not.toBe(true)
  })

  // ── Required fields ───────────────────────────────────────────────────────

  it('rejects missing fullName', () => {
    const { fullName: _, ...data } = valid
    expect(validateJoinRequest(data)).not.toBe(true)
  })

  it('rejects missing email', () => {
    const { email: _, ...data } = valid
    expect(validateJoinRequest(data)).not.toBe(true)
  })

  it('rejects invalid email', () => {
    expect(validateJoinRequest({ ...valid, email: 'not-valid' })).not.toBe(true)
  })

  it('rejects missing phone', () => {
    const { phone: _, ...data } = valid
    expect(validateJoinRequest(data)).not.toBe(true)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('accepts a valid join request', () => {
    expect(validateJoinRequest(valid)).toBe(true)
  })
})
