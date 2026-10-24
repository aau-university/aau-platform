import type { TextField } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  localized,
  localizedText,
  localizedTextarea,
  localizedRichText,
  type LocalizedTextOptions,
  type LocalizedTextareaOptions,
  type LocalizedRichTextOptions,
} from '../../fields/localized'
/**
 * Tests for the {@link localizedText}/`localizedTextarea`/`localizedRichText`
 * factories and the generic {@link localized} wrapper.
 *
 * Two concerns under test:
 *
 * 1. Behavioural: the three presets build the right field shape (type +
 *    `localized: true`) and pass through caller options.
 *
 * 2. Type-level (compile-time): the `Omit<TextField, 'localized' | 'name' | 'type'>`
 *    options type accepts every field option EXCEPT `name`, `type`, and
 *    `localized` — those are owned by the factory and must never be
 *    overridable from the call site. The `@ts-expect-error` directives
 *    below pin this contract; if TypeScript ever stops erroring on those
 *    assignments, the type has been widened incorrectly.
 */

describe('localizedText()', () => {
  it('builds a localized text field with the given name', () => {
    const field = localizedText('title')
    expect(field.name).toBe('title')
    expect(field.type).toBe('text')
    expect(field.localized).toBe(true)
  })

  it('forwards caller options (required, maxLength, admin)', () => {
    const field = localizedText('title', {
      required: true,
      maxLength: 200,
      admin: { description: 'The page title' },
    })
    expect(field.required).toBe(true)
    expect(field.maxLength).toBe(200)
    expect(field.admin?.description).toBe('The page title')
  })

  it('accepts a `validate` function (allowed by the Omit type)', () => {
    const validate = () => true as const
    const field = localizedText('title', { validate: validate as TextField['validate'] })
    expect(typeof field.validate).toBe('function')
  })
})

describe('localizedTextarea()', () => {
  it('builds a localized textarea field', () => {
    const field = localizedTextarea('summary')
    expect(field.name).toBe('summary')
    expect(field.type).toBe('textarea')
    expect(field.localized).toBe(true)
  })

  it('forwards caller options', () => {
    const field = localizedTextarea('summary', {
      required: true,
      maxLength: 500,
      admin: { rows: 5 },
    })
    expect(field.required).toBe(true)
    expect(field.maxLength).toBe(500)
    expect(field.admin?.rows).toBe(5)
  })
})

describe('localizedRichText()', () => {
  it('builds a localized richText field', () => {
    const field = localizedRichText('content')
    expect(field.name).toBe('content')
    expect(field.type).toBe('richText')
    expect(field.localized).toBe(true)
  })
})

describe('localized() (generic wrapper)', () => {
  it('forces `localized: true` on a text field', () => {
    const field = localized<TextField>({ name: 'tagline', type: 'text' })
    expect(field.name).toBe('tagline')
    expect(field.type).toBe('text')
    expect(field.localized).toBe(true)
  })

  it('overrides an existing `localized: false`', () => {
    const field = localized<TextField>({ name: 'tagline', type: 'text', localized: false })
    expect(field.localized).toBe(true)
  })

  it('does not mutate the caller\'s original object', () => {
    const original: TextField = { name: 'tagline', type: 'text', localized: false }
    const result = localized(original)
    expect(original.localized).toBe(false)
    expect(result.localized).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Compile-time type-level tests
// ---------------------------------------------------------------------------

// `Omit<TextField, 'localized' | 'name' | 'type'>` must:
//   - ACCEPT every other TextField option (admin, required, validate, maxLength, etc.)
//   - REJECT `name`, `type`, and `localized`

// ACCEPT: `admin` is a valid option.
type _AcceptAdmin = LocalizedTextOptions extends { admin?: unknown } ? true : false
const _acceptAdminCheck: _AcceptAdmin = true

// ACCEPT: `validate` is a valid option.
type _AcceptValidate = LocalizedTextOptions extends { validate?: unknown } ? true : false
const _acceptValidateCheck: _AcceptValidate = true

// ACCEPT: `required` is a valid option.
type _AcceptRequired = LocalizedTextOptions extends { required?: unknown } ? true : false
const _acceptRequiredCheck: _AcceptRequired = true

// REJECT: `name` is NOT a valid option (owned by the factory's first arg).
// @ts-expect-error — `name` must not be assignable to LocalizedTextOptions
const _rejectName: LocalizedTextOptions = { name: 'forbidden' }

// REJECT: `type` is NOT a valid option (owned by the factory).
// @ts-expect-error — `type` must not be assignable to LocalizedTextOptions
const _rejectType: LocalizedTextOptions = { type: 'text' }

// REJECT: `localized` is NOT a valid option (the factory forces it to `true`).
// @ts-expect-error — `localized` must not be assignable to LocalizedTextOptions
const _rejectLocalized: LocalizedTextOptions = { localized: false }

// Same contract for textarea and richtext options:
// @ts-expect-error — `name` must not be assignable to LocalizedTextareaOptions
const _rejectTextareaName: LocalizedTextareaOptions = { name: 'forbidden' }
// @ts-expect-error — `localized` must not be assignable to LocalizedTextareaOptions
const _rejectTextareaLocalized: LocalizedTextareaOptions = { localized: false }
// @ts-expect-error — `type` must not be assignable to LocalizedRichTextOptions
const _rejectRichTextType: LocalizedRichTextOptions = { type: 'richText' }

describe('LocalizedTextOptions type contract (runtime smoke)', () => {
  it('accepts an empty options object', () => {
    const _options: LocalizedTextOptions = {}
    expect(_options).toBeDefined()
  })

  it('accepts a multi-option object', () => {
    const _options: LocalizedTextOptions = {
      required: true,
      maxLength: 200,
      admin: { description: 'Title' },
    }
    expect(_options).toBeDefined()
  })

  // The compile-time rejections above (the `@ts-expect-error` blocks) are
  // the primary contract test. The runtime smoke here just confirms the
  // type aliases resolve cleanly at runtime — if the @ts-expect-error
  // directives ever stop erroring, tsc will fail the build, surfacing the
  // regression before the test suite even runs.
  it('does not regress (the @ts-expect-error blocks above must keep firing)', () => {
    expect(true).toBe(true)
  })
})
