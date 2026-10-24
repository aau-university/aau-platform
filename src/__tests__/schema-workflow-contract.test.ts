import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (file: string): string => readFileSync(join(root, file), 'utf8')

describe('official Payload migration workflow contract', () => {
  it('exposes official migration commands and confines push to development', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>
    }
    const configSource = read('src/payload.config.ts')

    expect(packageJson.scripts.migrate).toContain('payload migrate')
    expect(packageJson.scripts['migrate:create']).toContain('payload migrate:create')
    expect(packageJson.scripts['migrate:status']).toContain('payload migrate:status')
    expect(configSource).toContain("migrationDir: path.resolve(dirname, 'migrations')")
    expect(configSource).toContain('push: !isProduction && payloadDbPushRequested')
    expect(configSource).toContain('Apply official Payload migrations instead')
  })

  it('does not retain the removed production schema initializer', () => {
    expect(existsSync(join(root, 'scripts/initialize-production-schema.ts'))).toBe(false)
    expect(existsSync(join(root, 'scripts/production-schema-guard.ts'))).toBe(false)
    expect(existsSync(join(root, 'scripts/assert-build-database.ts'))).toBe(false)
    expect(read('package.json')).not.toContain('schema:init:production')
  })
})
