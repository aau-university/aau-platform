import { z } from 'zod'

/**
 * Zod schema for the public contact form.
 *
 * Aligns with src/collections/ContactMessages.ts:
 *   - name: required, trimmed, 1..120 chars
 *   - email: required, valid
 *   - phone: optional, max 32 chars
 *   - subject: required, 1..160 chars
 *   - message: required, 10..5000 chars
 *   - _hp: honeypot — MUST be empty string or absent (anything else => reject)
 */

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z.string().trim().email('A valid email is required').max(320),
  phone: z
    .string()
    .trim()
    .max(32, 'Phone is too long')
    .optional()
    .or(z.literal('')),
  subject: z.string().trim().min(1, 'Subject is required').max(160, 'Subject is too long'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long'),
  // Honeypot — anything but empty/missing rejects.
  _hp: z.literal('').optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
