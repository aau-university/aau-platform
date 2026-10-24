import { z } from 'zod'

/**
 * Zod schema for the public join-request (admission) form.
 *
 * Aligns with src/collections/JoinRequests.ts. Only the fields the form
 * is allowed to set from the public site are listed here — `status`,
 * `notes`, etc. are admin-only and must NOT come from the public payload.
 */

const phoneRegex = /^[+]?[\d\s()-]{7,32}$/

export const joinRequestSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(160),
  email: z.string().trim().email('A valid email is required').max(320),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number format')
    .max(32),
  nationalId: z.string().trim().max(64).optional().or(z.literal('')),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(),
  highSchoolType: z.string().trim().max(80).optional().or(z.literal('')),
  highSchoolGpa: z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(/^\d+(\.\d+)?$/)
        .transform((s) => Number.parseFloat(s)),
    ])
    .pipe(z.number().min(0).max(100))
    .optional(),
  // Payload's Postgres adapter exposes relationship IDs as numbers. The
  // public form may post them as strings or numbers — both are coerced to
  // number here, and non-numeric values are rejected.
  desiredCollege: z.coerce.number().int().positive().optional(),
  desiredProgram: z.coerce.number().int().positive().optional(),
  highSchoolDocument: z.any().optional(),
  idDocument: z.any().optional(),
  personalPhoto: z.any().optional(),
  educationStatus: z.enum(['graduate', 'student']).optional(),
  // Honeypot
  _hp: z.literal('').optional(),
})

export type JoinRequestInput = z.infer<typeof joinRequestSchema>
