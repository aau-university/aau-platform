import { cpSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const standalone = path.join(root, '.next', 'standalone')
const server = path.join(standalone, 'server.js')

if (!existsSync(server)) {
  throw new Error('Missing .next/standalone/server.js. Build with standalone output first.')
}

for (const [source, destination] of [
  [path.join(root, 'public'), path.join(standalone, 'public')],
  [path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static')],
]) {
  if (!existsSync(source)) {
    throw new Error(`Missing required standalone asset directory: ${path.relative(root, source)}`)
  }
  cpSync(source, destination, { recursive: true })
}
