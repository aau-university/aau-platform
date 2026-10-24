import type { CollectionConfig } from 'payload'

import { canUploadMedia, mediaOwnerOrManager, hideUnlessPermission } from '../access'
import { localizedText, localizedTextarea } from '../fields/localized'
import { populateUploadedBy } from '../hooks/populateUploadedBy'
import { revalidatePublicCollection } from '../hooks/revalidatePublicCache'
import { uploadStaticDir } from '../lib/storage/upload-static-dir'

const mediaRevalidation = revalidatePublicCollection('media')

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    // Admin-nav visibility (see src/access/admin-nav.ts). `access` below
    // remains the authoritative guard; this only shapes the panel.
    hidden: hideUnlessPermission('media.upload'),
  },
  access: {
    // Content manager+ always; coordinators with the `media.upload` key too —
    // they author college content and need images for it.
    create: canUploadMedia,
    read: () => true,
    // Coordinators are limited to files they uploaded (`uploadedBy`).
    update: mediaOwnerOrManager,
    delete: mediaOwnerOrManager,
  },
  hooks: {
    beforeChange: [populateUploadedBy],
    afterChange: [mediaRevalidation.afterChange],
    afterDelete: [mediaRevalidation.afterDelete],
  },
  upload: {
    staticDir: uploadStaticDir('media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 300, height: 300, position: 'centre' },
      { name: 'square', width: 500, height: 500, position: 'centre' },
      { name: 'small', width: 640 },
      { name: 'medium', width: 1024 },
      { name: 'large', width: 1920 },
      { name: 'xlarge', width: 2560 },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'video/*', 'application/pdf', 'audio/*'],
  },
  fields: [
    localizedText('alt', { required: true }),
    localizedTextarea('caption'),
    {
      // Ownership stamp for coordinator uploads. Written only by the
      // `populateUploadedBy` hook — never client-writable — and read by
      // `mediaOwnerOrManager` to scope coordinator update/delete.
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
