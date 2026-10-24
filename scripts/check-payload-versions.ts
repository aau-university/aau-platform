import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest
const declared = { ...manifest.dependencies, ...manifest.devDependencies }
const payloadVersion = declared.payload

if (!payloadVersion || !/^\d+\.\d+\.\d+$/.test(payloadVersion)) {
  throw new Error('payload must be pinned to an exact semantic version.')
}

const payloadPackages = Object.entries(declared).filter(
  ([name]) => name === 'payload' || name.startsWith('@payloadcms/'),
)
for (const [name, version] of payloadPackages) {
  if (version !== payloadVersion) {
    throw new Error(`${name} must be pinned to Payload ${payloadVersion}; found ${version}.`)
  }
}

const installed = JSON.parse(
  execFileSync('pnpm', ['list', '--depth', '0', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  }),
) as Array<{
  dependencies?: Record<string, { version?: string }>
  devDependencies?: Record<string, { version?: string }>
}>
const installedRoot = installed[0]
const installedPackages = {
  ...installedRoot?.dependencies,
  ...installedRoot?.devDependencies,
}

for (const [name] of payloadPackages) {
  const version = installedPackages[name]?.version
  if (version !== payloadVersion) {
    throw new Error(`${name} installed version must be ${payloadVersion}; found ${version ?? 'missing'}.`)
  }
}

console.info(
  `[payload-version-check] version=${payloadVersion} packages=${payloadPackages.length} status=ok`,
)
