import { describe, expect, it } from 'vitest'

import { createMinimalPDF } from '../../../tests/helpers/minimalPdf'

describe('minimal E2E PDF', () => {
  it('has valid object and xref byte offsets', () => {
    const pdf = createMinimalPDF()
    const source = pdf.toString('ascii')
    const startxref = /startxref\n(\d+)\n%%EOF\n$/.exec(source)

    expect(source.startsWith('%PDF-1.4\n')).toBe(true)
    expect(startxref).not.toBeNull()

    const xrefOffset = Number(startxref?.[1])
    expect(pdf.subarray(xrefOffset, xrefOffset + 5).toString('ascii')).toBe('xref\n')

    const xref = source.slice(xrefOffset).split('\n')
    expect(xref[1]).toBe('0 6')
    for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
      const objectOffset = Number(xref[objectNumber + 2]?.slice(0, 10))
      expect(pdf.subarray(objectOffset).toString('ascii')).toMatch(
        new RegExp(`^${objectNumber} 0 obj\\n`),
      )
    }
  })

  it('declares the exact content stream length', () => {
    const source = createMinimalPDF().toString('ascii')
    const stream = /\/Length (\d+) >>\nstream\n([\s\S]*?)endstream/.exec(source)

    expect(stream).not.toBeNull()
    expect(Buffer.byteLength(stream?.[2] ?? '', 'ascii')).toBe(Number(stream?.[1]))
  })
})
