import type { Plugin } from 'payload'

import { seoPlugin } from '@payloadcms/plugin-seo'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { s3Storage } from '@payloadcms/storage-s3'
import { payloadAiPlugin } from '@ai-stack/payloadcms'
import computeBlurhash from 'payload-blurhash-plugin'
import { aiLocalization } from 'payload-plugin-ai-localization'
import { openapi, swaggerUI } from 'payload-oapi'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'

import {
  canAccessAdmin,
  hideBelowLevel,
  isAdminOrAbove,
  isContentManagerOrAbove,
} from '../access'
import {
  revalidateRedirectsAfterChange,
  revalidateRedirectsAfterDelete,
} from '../hooks/revalidateRedirects'
import { ROUTED_COLLECTION_SLUGS } from '../utilities/collectionRoutes'

/** Optional plugins stay behind explicit environment flags. */

const s3Enabled = process.env.S3_ENABLED === 'true'
const openApiEnabled = process.env.OPENAPI_ENABLED === 'true'
const payloadAiEnabled = process.env.PAYLOAD_AI_ENABLED === 'true'
const aiLocalizationEnabled = process.env.AI_LOCALIZATION_ENABLED === 'true'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} must be set before Payload starts.`)
  }

  return value
}

function s3Env(name: string): string {
  return s3Enabled ? requireEnv(name) : `disabled-${name.toLowerCase()}`
}

const aiEnabledCollections = {
  pages: true,
  news: true,
  colleges: true,
  'academic-programs': true,
  'faculty-members': true,
  events: true,
  'blog-posts': true,
  faqs: true,
  'team-members': true,
}

const aiLocalizationCollections = {
  pages: { fields: ['title', 'content'] },
  news: { fields: ['title', 'summary', 'content'] },
  colleges: {
    fields: ['name', 'description', 'admissionRequirements', 'vision', 'mission', 'goals', 'values', 'strategy', 'quality'],
  },
  'academic-programs': {
    fields: ['name', 'description', 'objectives', 'careerProspects', 'applicationSteps', 'whyProgram'],
  },
  'faculty-members': { fields: ['fullName', 'academicTitle', 'biography', 'officeHours', 'researchInterests'] },
  events: { fields: ['title', 'description', 'location', 'organizer'] },
  'blog-posts': { fields: ['title', 'excerpt', 'content'] },
  faqs: { fields: ['question', 'answer', 'category'] },
  'team-members': { fields: ['name', 'jobTitle', 'group', 'bio'] },
}

export const plugins: Plugin[] = [
  seoPlugin({
    collections: ['pages', 'news', 'colleges', 'events', 'blog-posts', 'academic-programs', 'faculty-members'],
    uploadsCollection: 'media',
  }),
  formBuilderPlugin({
    fields: {
      text: true,
      textarea: true,
      select: true,
      email: true,
      state: false,
      country: false,
      checkbox: true,
      message: true,
      number: true,
      upload: true,
    },
    uploadCollections: ['media'],
    // Plugin-generated collections are not coordinator-facing: forms are a
    // site-wide tool and submissions carry visitor-entered data. The plugin
    // spreads these overrides into its own config, so its `admin` defaults
    // and `access.create` (public submit) survive.
    formOverrides: {
      admin: { hidden: hideBelowLevel(3) },
      // Any operation the plugin does not set falls through to Payload's
      // `defaultAccess` = "any authenticated user", which would let a student
      // or coordinator create/edit/delete site forms. Every op is pinned.
      access: {
        create: isContentManagerOrAbove,
        read: isContentManagerOrAbove,
        update: isContentManagerOrAbove,
        delete: isContentManagerOrAbove,
      },
    },
    formSubmissionOverrides: {
      admin: { hidden: hideBelowLevel(3) },
      // The plugin default is `read: ({ req: { user } }) => !!user` and no
      // `delete` at all, so every visitor submission was readable — and
      // deletable — by ANY authenticated account. Submissions are a form
      // inbox like ContactMessages: content manager reads and triages,
      // deletion stays admin+ like the other PII inboxes. `create` is left to
      // the plugin so public form submits keep working.
      access: {
        read: isContentManagerOrAbove,
        update: isContentManagerOrAbove,
        delete: isAdminOrAbove,
      },
    },
  }),
  redirectsPlugin({
    collections: [...ROUTED_COLLECTION_SLUGS],
    // Expire the same Next cache tag registered by the public redirect
    // loader whenever an official plugin row changes.
    overrides: {
      // Redirect management is a site-wide concern, not a college one.
      // `read` stays public — redirect resolution runs unauthenticated — but
      // the plugin sets ONLY `read`, so writes fell through to Payload's
      // `defaultAccess` = "any authenticated user". That let a student POST a
      // redirect and hijack any path to an external URL.
      admin: { hidden: hideBelowLevel(3) },
      access: {
        create: isContentManagerOrAbove,
        update: isContentManagerOrAbove,
        delete: isContentManagerOrAbove,
      },
      hooks: {
        afterChange: [revalidateRedirectsAfterChange],
        afterDelete: [revalidateRedirectsAfterDelete],
      },
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'managed',
          type: 'checkbox',
          defaultValue: false,
          admin: { hidden: true },
          access: {
            create: () => false,
            update: () => false,
          },
        },
        {
          name: 'managedTargetCollection',
          type: 'text',
          admin: { hidden: true },
          access: {
            create: () => false,
            update: () => false,
          },
        },
        {
          name: 'managedTargetDocumentId',
          type: 'text',
          admin: { hidden: true },
          access: {
            create: () => false,
            update: () => false,
          },
        },
        {
          name: 'managedTargetRouteKey',
          type: 'text',
          admin: { hidden: true },
          access: {
            create: () => false,
            update: () => false,
          },
        },
        {
          name: 'disabled',
          type: 'checkbox',
          defaultValue: false,
          admin: { hidden: true },
          access: {
            create: () => false,
            update: () => false,
          },
        },
      ],
    },
  }),
  s3Storage({
    enabled: s3Enabled,
    bucket: s3Env('S3_BUCKET'),
    collections: {
      media: {
        prefix: process.env.S3_PREFIX || 'media',
        // Generate public URLs pointing to the R2 public bucket domain
        // (e.g. https://pub-xxxx.r2.dev/media/<filename>) instead of the
        // S3 API endpoint (which returns 400 for unauthenticated GET).
        // Falls back to the S3 API endpoint if R2_PUBLIC_URL is not set
        // (preserves the previous behavior for local/dev environments).
        ...(process.env.R2_PUBLIC_URL
          ? {
              generateFileURL: ({ filename, prefix }) => {
                const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, '')
                const p = prefix || 'media'
                // Encode the filename but preserve path separators for sizes
                // (e.g. "bilala-300x300.jpg" stays as-is).
                const encoded = encodeURIComponent(filename)
                return `${base}/${p}/${encoded}`
              },
            }
          : {}),
      },
      'private-media': {
        prefix: process.env.S3_PRIVATE_PREFIX || 'private-media',
        // Intentionally NO `signedDownloads` and NO custom `generateFileURL`.
        // With neither set (and `disablePayloadAccessControl` unset — the
        // default), the stored `url` stays Payload's own
        // `/api/private-media/file/<filename>` route. That route runs
        // `checkFileAccess` → this collection's admin-only `read` access on
        // EVERY request before the S3 staticHandler streams the bytes — so
        // there is no publicly reachable or unsigned bucket URL.
        //
        // Enabling `signedDownloads` would make the staticHandler 302-redirect
        // to a ~2h presigned bearer URL instead; anyone it leaks to could then
        // download without auth for that window. That is the wrong tradeoff for
        // sensitive ID documents / personal photos, so we keep per-request auth.
      },
    },
    config: {
      endpoint: s3Enabled ? requireEnv('S3_ENDPOINT') : undefined,
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: s3Enabled
        ? {
            accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
            secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
          }
        : undefined,
    },
  }),
  computeBlurhash({
    collections: ['media'],
    showBlurhashField: false,
  }),
  openapi({
    enabled: openApiEnabled,
    metadata: {
      title: 'AAU Payload Platform API',
      version: '0.1.0',
      description: 'Internal OpenAPI schema for the AAU Payload Platform.',
    },
    specEndpoint: '/openapi.json',
    authEndpoint: '/openapi-auth',
    openapiVersion: '3.1',
  }),
  swaggerUI({
    enabled: openApiEnabled && process.env.OPENAPI_DOCS_ENABLED === 'true',
    specEndpoint: '/openapi.json',
    docsUrl: '/docs',
  }),
  ...(payloadAiEnabled
    ? [
        payloadAiPlugin({
          access: {
            generate: ({ req }) => canAccessAdmin(req.user),
            settings: ({ req }) => canAccessAdmin(req.user),
          },
          collections: aiEnabledCollections,
          disableSponsorMessage: true,
          globals: {
            'about-page': true,
            'contact-settings': true,
            'site-settings': true,
          },
          uploadCollectionSlug: 'media',
        }),
      ]
    : []),
  ...(aiLocalizationEnabled
    ? [
        aiLocalization({
          collections: aiLocalizationCollections,
          openai: {
            apiKey: requireEnv('OPENAI_API_KEY'),
            model: process.env.AI_LOCALIZATION_MODEL || 'gpt-4o-mini',
          },
        }),
      ]
    : []),
]
