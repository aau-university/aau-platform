/**
 * Pure validation helpers for public form submissions.
 *
 * These are extracted from beforeValidate hooks so they can be unit-tested
 * without Payload initialization. They validate structure, honeypot, and
 * content rules.
 *
 * Returns `true` if the data is valid, or an error string describing the problem.
 */

type ValidationResult = true | string

/**
 * Validates an email string with a simple RFC-compatible regex.
 * We intentionally avoid complex validation; the email must have
 * a local part, @, and a domain with at least one dot.
 */
function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  // Simple but effective: local@domain.tld
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/**
 * Returns true if the honeypot field is absent or empty string.
 * Any non-empty honeypot value indicates an automated submission.
 */
function isHoneypotClear(data: Record<string, unknown>): boolean {
  const hp = data._hp
  return hp === undefined || hp === null || hp === ''
}

/**
 * Validates a contact message submission.
 *
 * Required: name (non-empty string), email (valid), subject, message (≥ 10 chars).
 * Honeypot field `_hp` must be absent or empty.
 */
export function validateContactMessage(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') return 'Invalid payload'

  const d = data as Record<string, unknown>

  if (!isHoneypotClear(d)) return 'Submission rejected'

  if (!d.name || typeof d.name !== 'string' || !d.name.trim()) {
    return 'Name is required'
  }

  if (!isValidEmail(d.email)) {
    return 'A valid email address is required'
  }

  if (!d.subject || typeof d.subject !== 'string' || !d.subject.trim()) {
    return 'Subject is required'
  }

  if (!d.message || typeof d.message !== 'string' || d.message.trim().length < 10) {
    return 'Message must be at least 10 characters'
  }

  return true
}

/**
 * Validates a join request submission.
 *
 * Required: fullName (non-empty), email (valid), phone (non-empty).
 * Honeypot field `_hp` must be absent or empty.
 */
export function validateJoinRequest(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') return 'Invalid payload'

  const d = data as Record<string, unknown>

  if (!isHoneypotClear(d)) return 'Submission rejected'

  if (!d.fullName || typeof d.fullName !== 'string' || !d.fullName.trim()) {
    return 'Full name is required'
  }

  if (!isValidEmail(d.email)) {
    return 'A valid email address is required'
  }

  if (!d.phone || typeof d.phone !== 'string' || !d.phone.trim()) {
    return 'Phone number is required'
  }

  return true
}
