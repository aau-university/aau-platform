import type { CollectionConfig } from 'payload'

import { isAdminOrAbove, isContentManagerOrAbove, hideBelowLevel } from '../access'
import { localizedText } from '../fields/localized'
import { uploadStaticDir } from '../lib/storage/upload-static-dir'

/**
 * PrivateMedia — Media collection (PR-025 / V2-01 §2.3).
 *
 * Separate-collection model for sensitive uploads (JoinRequests ID documents,
 * ContactMessages attachments). Stored in a dedicated `uploads/private`
 * directory that is NOT exposed via the public Next.js static handler.
 * Files are served only through Payload's own `/api/private-media/file/...`
 * route, which enforces the admin-only `read` access below on every request
 * (via `checkFileAccess`) before streaming the bytes. `signedDownloads` is
 * deliberately left off in `src/plugins/index.ts` so there is no time-limited
 * presigned bearer URL — per-request auth is the safer choice for these files.
 *
 * NOT registered on the public `Media` collection so it cannot be served
 * accidentally by `getMediaUrl` or other public helpers.
 *
 * Access model:
 *   - `create`/`read`/`update`: `isContentManagerOrAbove` (level 3+).
 *     Content managers author Student Affairs Documents (whose `file`
 *     relation points here) and already read JoinRequests — the collection
 *     that owns the applicant PII these files belong to — so this grants
 *     no data they cannot already reach, while making it possible to
 *     publish a new student document with a new file from the admin panel.
 *     (Create was previously `() => false`, which blocked EVERY admin-panel
 *     upload; form server actions upload with `overrideAccess: true` and
 *     are unaffected either way.)
 *   - `delete`: `isAdminOrAbove` (admin+) — destructive, stays higher.
 */
export const PrivateMedia: CollectionConfig = {
  slug: 'private-media',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideBelowLevel(3),
    group: 'Media',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mimeType', 'createdAt'],
  },
  access: {
    create: isContentManagerOrAbove,
    read: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
    delete: isAdminOrAbove,
  },
  upload: {
    staticDir: uploadStaticDir('private'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'medium', width: 1024 },
    ],
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    localizedText('alt', { label: 'Alt Text' }),
  ],
  timestamps: true,
}
