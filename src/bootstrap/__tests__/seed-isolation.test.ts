import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildModuleGraph,
  staticModuleSpecifiers,
} from '@/__tests__/helpers/module-graph'

import { roleFixtures, reservedRoleSlugs } from '@/seed/fixtures/roles'

/**
 * §7 / §21.3 of the Docker/VPS plan: the broad canonical Seed must never be
 * reachable from the production startup or deploy path.
 *
 * This walks the real static import graph out of the bootstrap entry point
 * rather than trusting a comment, so adding an import of `runSeed`,
 * `rolesStage` or `defaultSeedStages` anywhere in that graph fails the build.
 */

const SRC_ROOT = path.resolve(__dirname, '../..')
const BOOTSTRAP_ENTRY = path.resolve(SRC_ROOT, 'bootstrap/ensure-system-roles-and-super-admin.ts')

const FORBIDDEN_SEED_MODULES = [
  'seed/run',
  'seed/run-seed',
  'seed/stages',
]

const FORBIDDEN_SYMBOLS = ['runSeed', 'rolesStage', 'defaultSeedStages', 'bootstrapAdminStage']

function staticImportGraph(entry: string): Map<string, string> {
  // The walk itself lives in the shared helper, because the version-backfill
  // guard needs exactly the same graph and a second copy would drift.
  return new Map(buildModuleGraph(SRC_ROOT, [entry]).files)
}

describe('production identity bootstrap is isolated from the broad Seed', () => {
  const graph = staticImportGraph(BOOTSTRAP_ENTRY)

  it('reaches the canonical role fixtures as its single seed-directory dependency', () => {
    const seedFiles = [...graph.keys()]
      .filter((file) => file.includes(`${path.sep}seed${path.sep}`))
      .map((file) => path.relative(SRC_ROOT, file).split(path.sep).join('/'))

    expect(seedFiles).toEqual(['seed/fixtures/roles.ts'])
  })

  it('never imports the broad Seed runner or any Seed stage', () => {
    for (const [file, source] of graph) {
      for (const forbidden of FORBIDDEN_SEED_MODULES) {
        expect(
          source.includes(`'@/${forbidden}'`) || source.includes(`"@/${forbidden}"`),
          `${path.relative(SRC_ROOT, file)} must not import ${forbidden}`,
        ).toBe(false)
      }
    }
  })

  it('never references a broad Seed entry symbol', () => {
    for (const [file, source] of graph) {
      // The bootstrap module names these symbols in its own documentation, so
      // only import statements are inspected.
      const importStatements = source.match(/import[^;]*from[^;]*;/g) ?? []
      for (const statement of importStatements) {
        for (const symbol of FORBIDDEN_SYMBOLS) {
          expect(
            new RegExp(`\\b${symbol}\\b`).test(statement),
            `${path.relative(SRC_ROOT, file)} must not import ${symbol}`,
          ).toBe(false)
        }
      }
    }
  })

  // The collector is the load-bearing part of this guard: anything it fails to
  // see is a file the assertions above never look at, so a forbidden import
  // could hide there. These pin the four declaration forms against real
  // TypeScript source rather than trusting that the parser handles them.
  it.each([
    ["import { a } from 'x'", "import { a } from './target'"],
    ['side-effect import', "import './target'"],
    ['multiline import', "import {\n  a,\n  b,\n} from './target'"],
    ['export ... from', "export { a } from './target'"],
    ['import-equals', "import a = require('./target')"],
    ['dynamic import()', "const a = await import('./target')"],
  ])('collects the specifier from %s', (_name, source) => {
    expect(staticModuleSpecifiers('/virtual/file.ts', source)).toContain('./target')
  })

  it('does not invent specifiers from comments or string literals', () => {
    // A regex collector matched these; edges that do not exist widen the graph
    // and make the guard report files nobody imports.
    const source = [
      "// import './not-real'",
      "const doc = \"import './also-not-real'\"",
      "import { real } from './target'",
    ].join('\n')

    expect(staticModuleSpecifiers('/virtual/file.ts', source)).toEqual(['./target'])
  })

  it('uses the live roleFixtures as the canonical source of truth, not a second copy', () => {
    const source = readFileSync(BOOTSTRAP_ENTRY, 'utf8')

    expect(source).toMatch(/from '\.\.\/seed\/fixtures\/roles'/)
    // A hard-coded duplicate of the slug list would silently drift from the
    // fixtures. The bootstrap must derive everything from the imported array.
    for (const slug of reservedRoleSlugs) {
      const hardCoded = new RegExp(`['"]${slug}['"]`)
      if (slug === 'super_admin') continue // referenced deliberately as the identity anchor
      expect(hardCoded.test(source), `${slug} must not be hard-coded in the bootstrap`).toBe(false)
    }
  })

  it('covers the canonical role catalogue expected by the deployment plan', () => {
    expect(roleFixtures.map((fixture) => fixture.shared.slug)).toEqual([
      'super_admin',
      'admin',
      'content_manager',
      'coordinator',
      'student',
      'doctor',
    ])
  })
})

describe('production runtime never invokes the broad Seed', () => {
  const deployRoot = path.resolve(SRC_ROOT, '..', 'deploy')

  function readIfPresent(relative: string): string {
    try {
      return readFileSync(path.resolve(deployRoot, relative), 'utf8')
    } catch {
      return ''
    }
  }

  it('keeps `pnpm seed` out of the VPS runtime compose and deploy script', () => {
    for (const file of ['docker-compose.vps.yml', 'scripts/deploy.sh']) {
      const contents = readIfPresent(file)
      expect(contents, `${file} must exist`).not.toBe('')
      expect(contents).not.toMatch(/pnpm\s+seed/)
      expect(contents).not.toMatch(/seed-bootstrap/)
    }
  })

  it('pins PAYLOAD_SEED_ENABLED=false in the VPS runtime profile', () => {
    const compose = readIfPresent('docker-compose.vps.yml')

    expect(compose).toMatch(/PAYLOAD_SEED_ENABLED:\s*'false'/)
  })
})
