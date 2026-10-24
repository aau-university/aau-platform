import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildModuleGraph, filesCalling } from '@/__tests__/helpers/module-graph'

import { assertBackfillTargets, BackfillConfigurationError } from '../backfill'
import {
  assertBackfillAllowed,
  BACKFILL_MODE,
  parseBackfillArgs,
} from '../one-shot'
import {
  BACKFILL_COLLECTIONS,
  BACKFILL_EXCLUDED_COLLECTIONS,
  BACKFILL_GLOBALS,
} from '../targets'

const repoRoot = process.cwd()
const read = (relative: string) => readFileSync(path.join(repoRoot, relative), 'utf8')

/**
 * A stand-in for the parts of `Payload` the target assertion reads. The real
 * config is exercised by tests/int/version-backfill.int.spec.ts against a real
 * database; this covers the refusals, which must hold even on a host where the
 * config cannot be built.
 */
function fakePayload(options?: {
  dropCollection?: string
  undraftCollection?: string
  dropGlobal?: string
  unversionGlobal?: string
}) {
  const collections = Object.fromEntries(
    BACKFILL_COLLECTIONS.filter((slug) => slug !== options?.dropCollection).map((slug) => [
      slug,
      {
        config: {
          slug,
          versions:
            slug === options?.undraftCollection
              ? { maxPerDoc: 50 }
              : { drafts: { autosave: { interval: 400 } }, maxPerDoc: 50 },
        },
      },
    ]),
  )

  const globals = BACKFILL_GLOBALS.filter((slug) => slug !== options?.dropGlobal).map((slug) => ({
    slug,
    versions: slug === options?.unversionGlobal ? undefined : { max: 25 },
  }))

  return { collections, config: { globals } } as never
}

describe('version backfill targets', () => {
  it('covers exactly the entities PR #25 gave versioning', () => {
    expect([...BACKFILL_COLLECTIONS]).toEqual([
      'colleges',
      'academic-departments',
      'academic-programs',
      'faculty-members',
      'study-plans',
    ])
    expect([...BACKFILL_GLOBALS]).toEqual([
      'site-settings',
      'about-page',
      'contact-settings',
      'navbar-settings',
      'footer-settings',
    ])
  })

  it('never backfills Pages or News, which already hold a real version history', () => {
    expect([...BACKFILL_EXCLUDED_COLLECTIONS]).toEqual(['pages', 'news'])
    for (const excluded of BACKFILL_EXCLUDED_COLLECTIONS) {
      expect(BACKFILL_COLLECTIONS as readonly string[]).not.toContain(excluded)
    }
  })

  it('accepts a configuration that matches', () => {
    expect(() => assertBackfillTargets(fakePayload())).not.toThrow()
  })

  it('refuses a collection that no longer exists, rather than skipping it', () => {
    expect(() => assertBackfillTargets(fakePayload({ dropCollection: 'colleges' }))).toThrow(
      BackfillConfigurationError,
    )
    expect(() => assertBackfillTargets(fakePayload({ dropCollection: 'colleges' }))).toThrow(
      /collection 'colleges' does not exist/,
    )
  })

  it('refuses a collection that quietly lost its draft workflow', () => {
    expect(() => assertBackfillTargets(fakePayload({ undraftCollection: 'study-plans' }))).toThrow(
      /collection 'study-plans' has no drafts-enabled versions configuration/,
    )
  })

  it('refuses a missing or unversioned global', () => {
    expect(() => assertBackfillTargets(fakePayload({ dropGlobal: 'about-page' }))).toThrow(
      /global 'about-page' does not exist/,
    )
    expect(() => assertBackfillTargets(fakePayload({ unversionGlobal: 'footer-settings' }))).toThrow(
      /global 'footer-settings' has no versions configuration/,
    )
  })

  it('reports every configuration problem in one message', () => {
    let message = ''
    try {
      assertBackfillTargets(fakePayload({ dropCollection: 'colleges', dropGlobal: 'about-page' }))
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain("collection 'colleges'")
    expect(message).toContain("global 'about-page'")
  })
})

describe('version backfill one-shot arguments', () => {
  it('requires the explicit mode and has no default', () => {
    expect(() => parseBackfillArgs([])).toThrow(/--mode must be/)
    expect(() => parseBackfillArgs(['--mode'])).toThrow(/--mode must be/)
    expect(() => parseBackfillArgs(['--mode', 'full'])).toThrow(/--mode must be/)
    expect(parseBackfillArgs(['--mode', BACKFILL_MODE])).toEqual({ mode: BACKFILL_MODE })
  })

  it('uses the same mode string the import script passes', () => {
    expect(BACKFILL_MODE).toBe('backfill-initial-versions')
    expect(read('migration/scripts/neon-import.sh')).toContain(
      '/app/version-backfill-runner.mjs --mode backfill-initial-versions',
    )
  })
})

describe('version backfill runtime-side-effect refusals', () => {
  it('runs when the runtime flags are disabled', () => {
    expect(() =>
      assertBackfillAllowed({
        PAYLOAD_RUNTIME_MIGRATIONS: 'false',
        PAYLOAD_RUNTIME_BOOTSTRAP: 'false',
      }),
    ).not.toThrow()
    expect(() => assertBackfillAllowed({})).not.toThrow()
  })

  it('refuses to open Payload while migrations would be applied as a side effect', () => {
    expect(() =>
      assertBackfillAllowed({ PAYLOAD_RUNTIME_MIGRATIONS: 'true' }),
    ).toThrow(/PAYLOAD_RUNTIME_MIGRATIONS must be 'false'/)
  })

  it('refuses to open Payload while the identity bootstrap would run', () => {
    expect(() =>
      assertBackfillAllowed({ PAYLOAD_RUNTIME_BOOTSTRAP: 'true' }),
    ).toThrow(/PAYLOAD_RUNTIME_BOOTSTRAP must be 'false'/)
  })

  it('names both flags when both are enabled', () => {
    expect(() =>
      assertBackfillAllowed({
        PAYLOAD_RUNTIME_MIGRATIONS: 'true',
        PAYLOAD_RUNTIME_BOOTSTRAP: 'true',
      }),
    ).toThrow(/PAYLOAD_RUNTIME_MIGRATIONS and PAYLOAD_RUNTIME_BOOTSTRAP/)
  })
})

describe('the backfill stays a migration step', () => {
  /**
   * The requirement is not "it is not called from startup today" but "it cannot
   * become a startup step by accident". These assertions are on the files that
   * would have to change for that to happen.
   */
  // The literal check below is kept as the cheap first line, but it is NOT the
  // guard. Reading only the roots says nothing about a helper those roots
  // import: a future `src/bootstrap/warm-cache.ts` could import
  // `runVersionBackfill` and call it from `onInit`, and neither root would
  // contain the string "version-backfill".
  //
  // That path does not go anywhere near /app/version-backfill-runner.mjs, so
  // scripts/assert-runner-image.sh does not cover it either — that script
  // proves the ARTIFACT exists and guards its own CLI, which is a different
  // claim. `runVersionBackfill` is an ordinary exported function in
  // backfill.ts and is compiled into the application bundle like anything else.
  const SRC_ROOT = path.resolve(__dirname, '../../..')
  const STARTUP_ROOTS = [
    'src/payload.config.ts',
    'src/bootstrap/identity-bootstrap-runner.ts',
    'src/bootstrap/ensure-system-roles-and-super-admin.ts',
  ].map((file) => path.resolve(SRC_ROOT, '..', file))

  it('names the backfill in none of the startup roots', () => {
    for (const file of [
      'src/payload.config.ts',
      'src/bootstrap/identity-bootstrap-runner.ts',
    ]) {
      expect(read(file)).not.toContain('version-backfill')
    }
  })

  it('is not CALLED anywhere reachable from startup', () => {
    const graph = buildModuleGraph(SRC_ROOT, STARTUP_ROOTS)

    // Guards against a graph that quietly walked nothing: if the roots stopped
    // resolving, an empty graph would make the assertion below vacuous.
    expect(
      graph.files.size,
      'the startup module graph did not resolve — this assertion would prove nothing',
    ).toBeGreaterThan(5)

    const callers = filesCalling(graph, 'runVersionBackfill').map((file) =>
      path.relative(path.resolve(SRC_ROOT, '..'), file).split(path.sep).join('/'),
    )

    expect(
      callers,
      'the version backfill must not be invoked from anything the application startup reaches',
    ).toEqual([])
  })

  it('detects the call when a reachable module makes one', () => {
    // The assertion above is only worth having if it can fail. The legitimate
    // caller is the one-shot runner, which startup must NOT reach — so building
    // a graph from it proves the detector sees a real call.
    const oneShot = path.resolve(SRC_ROOT, 'migration/version-backfill/one-shot.ts')
    const graph = buildModuleGraph(SRC_ROOT, [oneShot])

    expect(filesCalling(graph, 'runVersionBackfill')).toContain(oneShot)
  })

  it('does not reach the one-shot runner from startup', () => {
    const graph = buildModuleGraph(SRC_ROOT, STARTUP_ROOTS)
    const reachable = [...graph.files.keys()].map((file) =>
      path.relative(path.resolve(SRC_ROOT, '..'), file).split(path.sep).join('/'),
    )

    expect(reachable).not.toContain('src/migration/version-backfill/one-shot.ts')
    expect(reachable).not.toContain('src/migration/version-backfill/backfill.ts')
  })

  it('is not a stage of the canonical Seed', () => {
    expect(read('src/seed/run-seed.ts')).not.toContain('version-backfill')
    expect(read('src/seed/one-shot.ts')).not.toContain('version-backfill')
  })

  it('is not invoked by any normal deployment script', () => {
    for (const file of [
      'deploy/scripts/deploy.sh',
      'deploy/scripts/restore.sh',
      'deploy/scripts/backup.sh',
      'deploy/scripts/seed.sh',
      // The root-owned entrypoint is a deployment path in its own right. It
      // delegates to deploy.sh today, but it is what SSH actually executes, so
      // a runner call added here would bypass every assertion above.
      'deploy/scripts/deploy-entrypoint.sh',
      'deploy/scripts/seed-entrypoint.sh',
      'deploy/scripts/initialize-from-backup.sh',
    ]) {
      expect(read(file)).not.toContain('version-backfill-runner')
    }
  })

  it('is invoked only by the Neon import, and only against the scratch database', () => {
    const importScript = read('migration/scripts/neon-import.sh')
    // Comment lines are stripped: this script explains its reasoning at length,
    // and the explanation names the artifact too.
    const importCode = importScript
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n')
    // Exactly one place actually RUNS it. The other mentions are the
    // capability pre-check on the image and the error message that explains it.
    const invocations = importCode.match(/node \/app\/version-backfill-runner\.mjs/g) ?? []
    expect(invocations).toHaveLength(1)
    expect(importCode).toContain("test -f /app/version-backfill-runner.mjs")
    expect(importScript).toContain('-e DATABASE_NAME="$SCRATCH_DB"')
    expect(importScript).toContain('-e PAYLOAD_RUNTIME_MIGRATIONS=false')
    expect(importScript).toContain('-e PAYLOAD_RUNTIME_BOOTSTRAP=false')
  })

  it('ships as a compiled artifact in the image, like the Seed runner', () => {
    const dockerfile = read('Dockerfile')
    expect(dockerfile).toContain('RUN node scripts/build-version-backfill-runner.mjs')
    expect(read('scripts/build-version-backfill-runner.mjs')).toContain(
      '.next/standalone/version-backfill-runner.mjs',
    )
    expect(read('scripts/assert-runner-image.sh')).toContain('/app/version-backfill-runner.mjs')
  })
})

describe('the backfill writes through Payload, not raw SQL', () => {
  const backfillSource = read('src/migration/version-backfill/backfill.ts')
  const code = backfillSource
    .split('\n')
    .filter((line) => !/^\s*(\*|\/\*|\/\/)/.test(line))
    .join('\n')

  it('uses saveVersion and never issues its own INSERT', () => {
    expect(code).toContain('saveVersion(')
    expect(code).not.toMatch(/INSERT\s+INTO/i)
    expect(code).not.toContain('payload.db.execute')
  })

  it('never calls payload.update(), which would run hooks and touch content', () => {
    expect(code).not.toContain('payload.update(')
    expect(code).not.toContain('payload.updateGlobal(')
  })

  it('skips any document that already has a version', () => {
    expect(code).toContain('countVersions')
    expect(code).toContain('countGlobalVersions')
  })
})
