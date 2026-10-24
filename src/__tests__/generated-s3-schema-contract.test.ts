import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('generated S3 field contract', () => {
  it('keeps plugin-injected prefix fields in the schema and owner types', () => {
    const schema = readFileSync(path.join(root, 'src/payload-generated-schema.ts'), 'utf8')
    const types = readFileSync(path.join(root, 'src/payload-types.ts'), 'utf8')

    expect(schema.match(/prefix: varchar\('prefix'\)/g)).toHaveLength(2)
    expect(types.match(/prefix\?: string \| null;/g)).toHaveLength(2)
    expect(types.match(/prefix\?: T;/g)).toHaveLength(2)
  })
})
