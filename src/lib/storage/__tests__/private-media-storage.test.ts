import { describe, expect, it } from 'vitest'

import {
  PrivateMediaStorageError,
  resolvePrivateMediaStorage,
} from '../private-media-storage'

/**
 * The shapes below are what `@payloadcms/plugin-cloud-storage` actually
 * produces, taken from its `plugin.js` / `fields/getFields.js`:
 *
 *   - enabled with an adapter -> `upload.disableLocalStorage: true` on the
 *     collection AND a hidden `prefix` text field appended to `fields`;
 *   - `enabled: false` (our `S3_ENABLED=false` profile) -> the plugin returns
 *     the incoming config untouched, so neither appears.
 */
function collection(fields: { name: string }[], upload: Record<string, unknown>) {
  return {
    collections: {
      'private-media': { config: { slug: 'private-media', fields, upload } },
    },
  }
}

describe('resolvePrivateMediaStorage', () => {
  it('reports the local-disk profile when the cloud-storage plugin is inactive', () => {
    const payload = collection([{ name: 'alt' }], { staticDir: '/srv/uploads/private' })

    expect(resolvePrivateMediaStorage(payload as never)).toEqual({
      mode: 'local',
      supportsPrefix: false,
    })
  })

  it('reports the remote profile when an adapter owns the bytes', () => {
    const payload = collection([{ name: 'alt' }, { name: 'prefix' }], {
      disableLocalStorage: true,
      staticDir: '/srv/uploads/private',
    })

    expect(resolvePrivateMediaStorage(payload as never)).toEqual({
      mode: 'remote',
      supportsPrefix: true,
    })
  })

  it('does not infer prefix support from disabled local storage alone', () => {
    // `disableLocalStorage` can be set by hand on a collection. The prefix
    // field is a separate fact and is read separately, because sending a
    // prefix Payload has no field for rejects the whole create.
    const payload = collection([{ name: 'alt' }], { disableLocalStorage: true })

    expect(resolvePrivateMediaStorage(payload as never)).toEqual({
      mode: 'remote',
      supportsPrefix: false,
    })
  })

  it('does not infer remote bytes from a prefix field alone', () => {
    // `alwaysInsertFields` inserts `prefix` with the plugin DISABLED, so the
    // field exists while the bytes still land on the local disk. Cleanup must
    // follow the bytes, not the field.
    const payload = collection([{ name: 'alt' }, { name: 'prefix' }], {})

    expect(resolvePrivateMediaStorage(payload as never)).toEqual({
      mode: 'local',
      supportsPrefix: true,
    })
  })

  it.each([
    ['no collections at all', {}],
    ['the collection missing', { collections: {} }],
    ['a collection without fields', { collections: { 'private-media': { config: {} } } }],
  ])('refuses to guess when the profile is unreadable (%s)', (_label, payload) => {
    expect(() => resolvePrivateMediaStorage(payload as never)).toThrow(PrivateMediaStorageError)
  })
})
