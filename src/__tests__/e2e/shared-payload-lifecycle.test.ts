import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Playwright runs the browser suite with `workers: 1`, so every spec file shares
 * ONE Node process and one cached Payload instance. A spec that calls
 * `payload.destroy()` in its teardown therefore tears down the database adapter
 * for every spec that runs AFTER it.
 *
 * That failure does not look like what it is. When it happened, the next file
 * alphabetically failed inside drizzle's `buildQuery` with "Cannot read
 * properties of undefined (reading 'id')" while seeding a role — pointing at a
 * file that had not changed, in a stack frame with no mention of the spec that
 * actually caused it. Running the offending spec on its own passes, because
 * nothing follows it.
 *
 * The Payload instance belongs to `tests/e2e/globalSetup.ts`, which owns its
 * lifecycle and destroys it in the teardown once every spec has finished.
 */
const E2E_DIR = path.join(process.cwd(), 'tests/e2e')

describe('the browser suite shares one Payload instance', () => {
  const specs = readdirSync(E2E_DIR).filter((name) => name.endsWith('.ts') && name !== 'globalSetup.ts')

  it('has spec files to check', () => {
    expect(specs.length).toBeGreaterThan(0)
  })

  it.each(specs)('%s does not destroy the shared Payload instance', (name) => {
    const source = readFileSync(path.join(E2E_DIR, name), 'utf8')
    const code = source
      .split('\n')
      .filter((line) => !/^\s*(\*|\/\*|\/\/)/.test(line))
      .join('\n')

    expect(code).not.toMatch(/payload\s*\??\.\s*destroy\s*\(/)
  })

  it('leaves the lifecycle to globalSetup, which destroys it on the NORMAL path', () => {
    const globalSetup = readFileSync(path.join(E2E_DIR, 'globalSetup.ts'), 'utf8')

    // Anywhere in the file is not enough: globalSetup also calls destroy() in
    // its setup-failure cleanup, so this matched even when the RETURNED
    // teardown had stopped calling it — and the shared instance would then
    // outlive a successful suite.
    const teardownAt = globalSetup.search(/return\s+async\s*\(\s*\)\s*=>/)
    expect(teardownAt, 'globalSetup must return an async teardown').toBeGreaterThan(-1)
    expect(globalSetup.slice(teardownAt)).toMatch(/payload\s*\??\.\s*destroy\s*\(/)
  })
})
