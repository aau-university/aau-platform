import { z } from 'zod'

/**
 * Zod schema for the public email-request form.
 *
 * Aligns with src/collections/EmailRequests.ts (approved plan model):
 *   - fullName: required
 *   - studentId: optional
 *   - college: optional
 *   - program: optional
 *   - phone: optional, max 32 chars
 *   - alternateEmail: optional, valid email
 *   - requestType: required enum
 *   - notes: optional, max 2000 chars
 *   - _hp: honeypot — MUST be empty or absent (bot detection)
 *
 * Security note:
 *   - Validation errors are NOT returned verbatim to the client.
 *   - The route handler returns a generic { ok: false, code: 'validation_failed' }
 *     to prevent leaking field structure to attackers.
 */

export const REQUEST_TYPES = [
  'academic_certificate',
  'transcript',
  'enrollment_verification',
  'grade_objection',
  'other',
] as const

export type RequestType = (typeof REQUEST_TYPES)[number]

export const emailRequestSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  studentId: z.string().trim().max(40).optional().or(z.literal('')),
  // Payload's Postgres adapter exposes relationship IDs as numbers. The
  // public form may post them as strings or numbers — both are coerced to
  // number here, and non-numeric values are rejected.
  college: z.coerce.number().int().positive().optional(),
  program: z.coerce.number().int().positive().optional(),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  alternateEmail: z.string().trim().email().max(320).optional().or(z.literal('')),
  requestType: z.enum(REQUEST_TYPES),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  // Honeypot — anything but empty/missing rejects the submission.
  _hp: z.literal('').optional(),
})

export type EmailRequestInput = z.infer<typeof emailRequestSchema>
