import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const canonicalEnvironment = {
  ...process.env,
  DATABASE_URI: 'postgresql://payload:payload@127.0.0.1:5432/aau_fixes_generation',
  NODE_OPTIONS: '--no-deprecation',
  PAYLOAD_DB_PUSH: 'false',
  PAYLOAD_SECRET: 'generated-artifact-contract-secret-32',
  S3_ACCESS_KEY_ID: 'schema-contract',
  S3_BUCKET: 'schema-contract',
  S3_ENABLED: 'true',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_REGION: 'auto',
  S3_SECRET_ACCESS_KEY: 'schema-contract-secret',
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    env: canonicalEnvironment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}

const generatedFiles = [
  'src/payload-types.ts',
  'src/payload-generated-schema.ts',
  'src/app/(payload)/admin/importMap.js',
] as const

const before = new Map(generatedFiles.map((file) => [file, readFileSync(file)]))

run('pnpm', ['generate:types'])
run('pnpm', ['generate:db-schema'])
run('pnpm', ['generate:importmap'])

const changed = generatedFiles.filter((file) => !before.get(file)?.equals(readFileSync(file)))

if (changed.length > 0) {
  throw new Error(`Generated artifacts were stale before verification: ${changed.join(', ')}`)
}
