/**
 * Verifies that public-form collections no longer allow anonymous direct
 * `create` (POST /api/contact-messages, POST /api/join-requests).
 *
 * The sanctioned entry points are:
 *   - POST /api/public/contact
 *   - POST /api/public/join-request
 * which validate, rate-limit, then call payload.create with overrideAccess.
 */

import { describe, expect, it } from 'vitest'

import { ContactMessages } from '../ContactMessages'
import { JoinRequests } from '../JoinRequests'

function callCreate(collection: { access?: { create?: unknown } }, user: unknown): unknown {
  const fn = collection.access?.create as (a: unknown) => unknown
  return fn({ req: { user } })
}

describe('public form collections — direct create is closed', () => {
  it('ContactMessages.create denies anonymous', () => {
    expect(callCreate(ContactMessages, null)).toBe(false)
  })

  it('JoinRequests.create denies anonymous', () => {
    expect(callCreate(JoinRequests, null)).toBe(false)
  })

  it('ContactMessages.create denies a logged-in student', () => {
    expect(callCreate(ContactMessages, { role: { slug: 'student' } })).toBe(false)
  })

  it('JoinRequests.create denies a logged-in student', () => {
    expect(callCreate(JoinRequests, { role: { slug: 'student' } })).toBe(false)
  })

  it('ContactMessages.create denies content_manager direct create', () => {
    expect(callCreate(ContactMessages, { role: { slug: 'content_manager' } })).toBe(false)
  })

  it('JoinRequests.create denies content_manager direct create', () => {
    expect(callCreate(JoinRequests, { role: { slug: 'content_manager' } })).toBe(false)
  })
})
