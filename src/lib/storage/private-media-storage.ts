import type { Payload } from 'payload'

export const PRIVATE_MEDIA_SLUG = 'private-media'

export type PrivateMediaStorageMode = 'local' | 'remote'

export interface PrivateMediaStorageProfile {
  /**
   * Where the bytes actually land. `remote` means a cloud-storage adapter owns
   * them and nothing is written to `uploads/private`.
   */
  mode: PrivateMediaStorageMode
  /**
   * Whether the collection exposes the cloud-storage `prefix` field. It is not
   * an application field: `@payloadcms/plugin-cloud-storage` injects it, and
   * only while it is active.
   */
  supportsPrefix: boolean
}

export class PrivateMediaStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrivateMediaStorageError'
  }
}

/**
 * Read the private-media storage profile off the LIVE collection config.
 *
 * Why the config and not `process.env.S3_ENABLED`:
 *
 *   The two answers have to agree, because one decides what we write and the
 *   other decides what we delete. `S3_ENABLED` is read when the Payload config
 *   is built; a caller reading it again later is reading a second, independent
 *   copy that can disagree — and a disagreement here means the compensating
 *   cleanup looks in a place the bytes were never written to, leaving an
 *   uploaded ID document behind after a failed submission.
 *
 *   The sanitized collection carries both answers directly, from the same
 *   object, and it is what Payload will actually honour:
 *
 *     - `upload.disableLocalStorage` is set to `true` by the cloud-storage
 *       plugin exactly when an adapter is wired for this collection, so it is
 *       the authority on whether bytes reach the local disk;
 *     - the `prefix` field exists only while that plugin is active, so its
 *       presence is the authority on whether `prefix` may be passed to
 *       `payload.create` at all. With S3 disabled the plugin returns the config
 *       untouched and passing `prefix` makes Payload reject the whole create
 *       with `Cannot find field for path at prefix`.
 *
 * An unresolvable profile throws rather than guessing. It is reached before any
 * byte is written, so failing here leaks nothing; guessing would.
 */
export function resolvePrivateMediaStorage(payload: Payload): PrivateMediaStorageProfile {
  const collection = payload.collections?.[PRIVATE_MEDIA_SLUG]?.config

  if (!collection || !Array.isArray(collection.fields)) {
    throw new PrivateMediaStorageError(
      `Cannot resolve the ${PRIVATE_MEDIA_SLUG} storage profile: the collection is not registered on this Payload instance.`,
    )
  }

  const upload = typeof collection.upload === 'object' ? collection.upload : undefined

  return {
    mode: upload?.disableLocalStorage === true ? 'remote' : 'local',
    supportsPrefix: collection.fields.some(
      (field) => 'name' in field && field.name === 'prefix',
    ),
  }
}
