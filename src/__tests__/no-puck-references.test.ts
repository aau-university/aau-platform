import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('removed page-builder guard', () => {
  const oldName = ['pu', 'ck'].join('')
  const oldNameTitle = ['Pu', 'ck'].join('')
  const packageA = [['@delmare', 'digital'].join(''), ['payload', oldName].join('-')].join('/')
  const packageB = [['@', oldName, 'editor'].join(''), 'core'].join('/')
  const forbidden = [
    ['@', oldName, 'editor'].join(''),
    ['payload', oldName].join('-'),
    ['create', oldNameTitle, 'Plugin'].join(''),
    [oldNameTitle, 'Renderer'].join(''),
    [oldName, 'Data'].join(''),
    ['DEFAULT_HOME', 'PUCK_DATA'].join('_'),
  ].join('|')

  it('has no active removed page-builder dependencies', () => {
    const pkg = read('package.json')
    expect(pkg).not.toContain(packageA)
    expect(pkg).not.toContain(packageB)
  })

  it('has no active removed page-builder imports or render path references', () => {
    const files = [
      'src/payload.config.ts',
      'src/app/(frontend)/page.tsx',
      'src/seed/run-seed.ts',
      'tests/helpers/seedUser.ts',
    ]

    for (const file of files) {
      const contents = read(file)
      expect(contents).not.toMatch(new RegExp(forbidden))
    }
  })
})
