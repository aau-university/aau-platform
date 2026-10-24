import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')

describe('release and production deployment contracts', () => {
  it('runs every required release gate without opt-in test skips', () => {
    const workflow = read('.github/workflows/release-gate.yml')
    for (const required of [
      'pnpm install --frozen-lockfile',
      'pnpm check:payload-versions',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test:unit',
      'pnpm test:int',
      'pnpm test:seed',
      'pnpm verify:generated',
      'pnpm build',
      'pnpm exec playwright install --with-deps chromium',
      'pnpm test:e2e',
      'docker build --target dev',
      'docker compose -f docker-compose.prod.yml',
      'actions/upload-artifact',
    ]) {
      expect(workflow).toContain(required)
    }
    expect(workflow).not.toContain('RUN_DB_INTEGRATION_TESTS')
    expect(workflow).toContain('node scripts/assert-seed-summary.mjs seed-second-run.log')
    expect(workflow).not.toContain("grep -q 'created.*0'")
  })

  it('keeps bootstrap provisioning outside normal production startup', () => {
    const compose = read('docker-compose.prod.yml')
    for (const required of [
      'migrate-prod:',
      'canonical-seed-source-build:',
      'app-prod:',
      "command: ['pnpm', 'payload', 'migrate']",
      'service_completed_successfully',
      'service_healthy',
      'restart: unless-stopped',
      "fetch('http://127.0.0.1:3000/api/health')",
      'postgres-prod-data:',
      'uploads-prod:',
    ]) {
      expect(compose).toContain(required)
    }
    // Renamed from `seed-bootstrap-prod`: it runs `pnpm seed`, the BROAD
    // canonical Seed, not the minimal identity bootstrap the VPS performs at
    // startup. Those have very different blast radii, and a name that blurs
    // them is how someone eventually runs the wrong one against production.
    expect(compose).toContain("profiles: ['canonical-seed']")
    expect(compose).toMatch(
      /canonical-seed-source-build:[\s\S]*INITIAL_ADMIN_EMAIL:[\s\S]*INITIAL_ADMIN_PASSWORD:/,
    )
    const migrateService = compose
      .split('  migrate-prod:')[1]
      .split('  canonical-seed-source-build:')[0]
    const bootstrapService = compose
      .split('  canonical-seed-source-build:')[1]
      .split('  app-prod:')[0]
    const appService = compose.split('  app-prod:')[1].split('\nvolumes:')[0]
    expect(bootstrapService).toContain('INITIAL_ADMIN_EMAIL:')
    expect(bootstrapService).toContain('INITIAL_ADMIN_PASSWORD:')
    expect(migrateService).not.toContain('INITIAL_ADMIN_')
    expect(appService).not.toContain('INITIAL_ADMIN_')
    expect(appService).not.toContain('canonical-seed-source-build:')
  })

  it('keeps migrations in an operations image and the app in standalone runner', () => {
    const dockerfile = read('Dockerfile')
    expect(dockerfile).toContain('FROM deps AS operations')
    expect(dockerfile).toContain('CMD ["pnpm", "payload", "migrate"]')
    // Digest-pinned, so match the SHAPE rather than the exact pin:
    // vps-deployment-contract.test.ts owns the assertion that every base image
    // carries a digest at all.
    //
    // The patch version is deliberately not hardcoded. It used to be, and that
    // broke this test the moment the base was bumped 24.15.0 -> 24.19.0 to pick
    // up a patched libgnutls30 — i.e. it failed exactly when a security fix was
    // applied, which is the worst possible time for a contract test to object
    // to something it does not actually govern.
    //
    // The MAJOR version is pinned, though, because it is governed: package.json
    // declares `engines.node` as >=24.0.0 <25.0.0, and a base bumped to node:26
    // would satisfy a `\d+` pattern while breaking that declared range.
    expect(dockerfile).toMatch(
      /^FROM node:24\.\d+\.\d+-bookworm-slim@sha256:[0-9a-f]{64} AS runner$/m,
    )
    expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./')
    expect(dockerfile).not.toContain('assert:build-database')

    // The runner stage must strip the package managers the base image bundles.
    // This is a cheap guard on the *instruction* being present; whether the
    // files are actually gone from the built image is asserted for real by
    // scripts/assert-runner-image.sh, which runs against the image itself.
    //
    // Matched as whole path operands, not as substrings: a `toContain` check
    // for '/usr/local/bin/yarn' is satisfied by '/usr/local/bin/yarnpkg',
    // which is how the first version of this assertion passed against a
    // Dockerfile with the yarn removal deleted.
    const runnerStage = dockerfile.slice(dockerfile.lastIndexOf(' AS runner'))
    const removedPaths = new Set(
      runnerStage
        .split(/\s+/)
        .map((token) => token.replace(/\\$/, ''))
        .filter((token) => token.startsWith('/usr/local/') || token.startsWith('/opt/')),
    )
    for (const removed of [
      '/usr/local/lib/node_modules/npm',
      '/usr/local/lib/node_modules/corepack',
      '/usr/local/bin/npm',
      '/usr/local/bin/npx',
      '/usr/local/bin/corepack',
      '/usr/local/bin/yarn',
      '/usr/local/bin/yarnpkg',
    ]) {
      expect([...removedPaths]).toContain(removed)
    }
  })

  it('runs Playwright against the prepared standalone artifact', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>
    }
    const playwright = read('playwright.config.ts')

    expect(packageJson.scripts['build:standalone']).toContain('prepare-standalone.mjs')
    expect(packageJson.scripts['start:standalone']).toContain('.next/standalone/server.js')
    expect(packageJson.scripts['test:e2e']).toContain('pnpm build:standalone')
    expect(playwright).toContain("command: 'pnpm start:standalone'")
    expect(playwright).not.toContain("command: 'pnpm start'")
  })

  it('proves normal redeploys do not seed or overwrite dynamic Role state', () => {
    const workflow = read('.github/workflows/release-gate.yml')
    const normalRedeploy = workflow
      .split('- name: Verify normal redeploy preserves dynamic Role state')[1]
      .split('- name: Capture Docker logs')[0]

    expect(normalRedeploy).toContain('"${compose[@]}" run --rm migrate-prod')
    expect(normalRedeploy).toContain('--force-recreate --wait app-prod')
    expect(normalRedeploy).toContain('verify-normal-deploy-role-state.ts')
    expect(normalRedeploy).toContain('core_before=')
    expect(normalRedeploy).toContain('versions_before=')
    expect(normalRedeploy).toContain('test "$core_after" = "$core_before"')
    expect(normalRedeploy).toContain('test "$versions_after" = "$versions_before"')
    expect(normalRedeploy).toContain('test "$seed_logs_before" = "0"')
    expect(normalRedeploy).toContain('test "$seed_logs_after" = "0"')
    expect(normalRedeploy).not.toContain('seed-bootstrap-prod')
    expect(normalRedeploy).not.toContain('INITIAL_ADMIN_')
  })

  it('compares every root version table during the second bootstrap run', () => {
    const workflow = read('.github/workflows/release-gate.yml')
    const idempotency = workflow
      .split('- name: Verify explicit bootstrap idempotency and version stability')[1]
      .split('- name: Verify normal redeploy preserves dynamic Role state')[0]

    expect(idempotency).toContain('snapshot_version_counts')
    expect(idempotency).toContain("tablename ~ '^_.*_v$'")
    expect(idempotency).toContain('test "$versions_after" = "$versions_before"')
    expect(idempotency).not.toContain('select count(*) from _pages_v')
  })
})
