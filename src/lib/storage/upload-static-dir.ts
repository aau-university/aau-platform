import path from 'node:path'

const UPLOADS_DIRECTORY_ENV = 'PAYLOAD_UPLOADS_DIR'

/**
 * Keep every Payload process on the same local upload root. This matters for
 * standalone tests, where Next changes its cwd while fixture workers do not.
 */
export function uploadStaticDir(collectionDirectory: 'media' | 'private'): string {
  const configuredRoot = process.env[UPLOADS_DIRECTORY_ENV]?.trim()
  const uploadsRoot = configuredRoot || path.resolve(process.cwd(), 'uploads')

  return path.resolve(uploadsRoot, collectionDirectory)
}
