export function createMinimalPDF(): Buffer {
  const content = 'BT /F1 12 Tf 36 100 Td (AAU E2E) Tj ET\n'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const chunks = [Buffer.from('%PDF-1.4\n', 'ascii')]
  const offsets = [0]
  let byteOffset = chunks[0].byteLength

  for (const [index, body] of objects.entries()) {
    offsets.push(byteOffset)
    const object = Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, 'ascii')
    chunks.push(object)
    byteOffset += object.byteLength
  }

  const xrefOffset = byteOffset
  const xrefEntries = [
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
  ]
  chunks.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n${xrefEntries.join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
      'ascii',
    ),
  )

  return Buffer.concat(chunks)
}
