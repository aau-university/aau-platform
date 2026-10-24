import { describe, expect, it } from 'vitest'

import { richTextToPlainText } from '../rich-text-to-plain-text'

describe('richTextToPlainText', () => {
  it('passes plain strings through unchanged', () => {
    expect(richTextToPlainText('hello')).toBe('hello')
  })

  it('returns empty string for null / undefined / empty input', () => {
    expect(richTextToPlainText(null)).toBe('')
    expect(richTextToPlainText(undefined)).toBe('')
    expect(richTextToPlainText('')).toBe('')
    expect(richTextToPlainText({})).toBe('')
  })

  it('extracts text from a Lexical paragraph', () => {
    const doc = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Welcome' }, { type: 'text', text: ' to AAU' }],
          },
        ],
      },
    }
    expect(richTextToPlainText(doc)).toBe('Welcome to AAU')
  })

  it('joins multiple block nodes with newlines', () => {
    const doc = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Line 1' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Line 2' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Line 3' }] },
        ],
      },
    }
    expect(richTextToPlainText(doc)).toBe('Line 1\nLine 2\nLine 3')
  })

  it('handles nested children (e.g. paragraph > bold > text)', () => {
    const doc = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'mark',
                children: [{ type: 'text', text: 'الأكاديمية العربية' }],
              },
            ],
          },
        ],
      },
    }
    expect(richTextToPlainText(doc)).toBe('الأكاديمية العربية')
  })

  it('accepts a bare children array without a root wrapper', () => {
    const doc = [
      { type: 'paragraph', children: [{ type: 'text', text: 'A' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'B' }] },
    ]
    expect(richTextToPlainText(doc)).toBe('A\nB')
  })

  it('returns empty string for malformed objects', () => {
    expect(richTextToPlainText({ random: 'shape' })).toBe('')
    expect(richTextToPlainText({ root: null })).toBe('')
    expect(richTextToPlainText({ root: 'not-an-object' })).toBe('')
  })

  it('does not crash on circular structures (depth-limited)', () => {
    const cycle: Record<string, unknown> = { children: [] }
    ;(cycle.children as unknown[]).push(cycle)
    // Should return empty (depth cap prevents recursion); the assertion
    // is "does not throw".
    expect(() => richTextToPlainText(cycle)).not.toThrow()
  })

  it('coerces numeric and boolean leaves to string', () => {
    const doc = {
      root: { children: [{ type: 'paragraph', children: [{ text: 42 }, { text: true }] }] },
    }
    // Numbers/booleans are picked up by the text-leaf branch when they
    // appear under `text`; this confirms graceful handling of unusual
    // exporters that emit non-string text values.
    expect(richTextToPlainText(doc)).toBe('42 true')
  })

  it('caps absurdly large output', () => {
    const big = {
      root: {
        children: Array.from({ length: 1000 }, () => ({
          type: 'paragraph',
          children: [{ type: 'text', text: 'X'.repeat(200) }],
        })),
      },
    }
    expect(richTextToPlainText(big).length).toBeLessThanOrEqual(50_000)
  })
})
