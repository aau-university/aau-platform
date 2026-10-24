import type { Where } from 'payload'
import type { Locale } from '@/i18n/locale'
import type { Project, User } from '@/payload-types'

import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'
import { getDraftPreviewDocument } from './get-draft-preview-document'
import { PUBLISHED_WHERE, buildPublicQueryOptions } from './query-helpers'
import { resolveMediaUrl } from './resolve-media'
import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import type { ContentReadContext } from './content-read-context'

export type PublicProjectStatus = 'current' | 'completed' | 'planned' | null

export interface PublicProjectImage {
  image: string | null
}

export interface PublicProjectItem {
  id: string
  title: string
  slug: string
  description: string
  image: string | null
  images: PublicProjectImage[]
  startDate: string
  endDate: string
  year: number | null
  progress: number | null
  projectStatus: PublicProjectStatus
  publishedAt: string
  displayOrder: number
}

export interface PublicProjectDetail extends PublicProjectItem {
  details: Project['details'] | null
}

export interface GetPublicProjectsOptions {
  limit?: number
  locale?: Locale
  readContext?: ContentReadContext
  page?: number
  projectStatus?: 'current' | 'completed' | 'planned'
}

export interface GetPublicProjectDetailOptions {
  locale?: Locale
  user?: User
  /**
   * When `true`, request the latest draft version without the published-only
   * filter. Payload access remains enforced for `user`.
   */
  draft?: boolean
  documentId?: number | string
}


function mapStatus(value: Project['projectStatus']): PublicProjectStatus {
  if (value === 'current' || value === 'completed' || value === 'planned') {
    return value
  }
  return null
}

function mapImages(doc: Project): PublicProjectImage[] {
  if (!Array.isArray(doc.images)) return []
  return doc.images
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || !('image' in entry)) {
        return null
      }
      return { image: resolveMediaUrl(entry.image) ?? null }
    })
    .filter((entry): entry is PublicProjectImage => entry !== null)
}

function mapListItem(doc: Project): PublicProjectItem {
  return {
    id: String(doc.id ?? ''),
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: doc.slug || String(doc.id ?? ''),
    description: typeof doc.description === 'string' ? doc.description : '',
    image: resolveMediaUrl(doc.image) ?? null,
    images: mapImages(doc),
    startDate: typeof doc.startDate === 'string' ? doc.startDate : '',
    endDate: typeof doc.endDate === 'string' ? doc.endDate : '',
    year: typeof doc.year === 'number' ? doc.year : null,
    progress: typeof doc.progress === 'number' ? doc.progress : null,
    projectStatus: mapStatus(doc.projectStatus),
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : '',
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
  }
}

function mapDetail(doc: Project): PublicProjectDetail {
  return {
    ...mapListItem(doc),
    details: doc.details ?? null,
  }
}

export async function getPublicProjects(
  options: GetPublicProjectsOptions = {},
): Promise<PublicProjectItem[]> {
  if (options.readContext?.draft) return queryProjectItems(options)
  return getPublishedProjectItems({ limit: options.limit, locale: options.locale, projectStatus: options.projectStatus })
}

async function getPublishedProjectItems(options: Omit<GetPublicProjectsOptions, 'readContext'>): Promise<PublicProjectItem[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('projects'))
  return queryProjectItems(options)
}

async function queryProjectItems(options: GetPublicProjectsOptions): Promise<PublicProjectItem[]> {
  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const queryOpts = buildPublicQueryOptions({
      ...options,
      sort: '-publishedAt',
      depth: 1,
    })
    const statusWhere = options.readContext?.draft ? null : PUBLISHED_WHERE
    const where = options.projectStatus
      ? {
          and: [
            ...(statusWhere ? [statusWhere] : []),
            { projectStatus: { equals: options.projectStatus } },
          ],
        }
      : statusWhere ?? undefined

    const result = await payload.find({
      collection: 'projects',
      where,
      ...queryOpts,
      draft: options.readContext?.draft ?? false,
      ...(options.readContext?.draft ? { user: options.readContext.user } : {}),
    })

    return result.docs.map((doc: Project) => mapListItem(doc))
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return []
  }
}

export async function getProjectBySlug(
  slug: string,
  options: GetPublicProjectDetailOptions = {},
): Promise<PublicProjectDetail | null> {
  if (options.draft) return queryProjectBySlug(slug, options)
  return getPublishedProjectBySlug(slug, options.locale)
}

async function getPublishedProjectBySlug(
  slug: string,
  locale?: Locale,
): Promise<PublicProjectDetail | null> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('projects'))
  return queryProjectBySlug(slug, { locale })
}

async function queryProjectBySlug(
  slug: string,
  options: GetPublicProjectDetailOptions,
): Promise<PublicProjectDetail | null> {
  try {
    const payload = await getPayloadSafe()
    if (!payload) return null

    const locale = options.locale ?? ('ar' as Locale)
    const draft = options.draft ?? false
    if (draft) {
      if (options.documentId == null || !options.user) return null
      const draftDoc = await getDraftPreviewDocument({
        collection: 'projects',
        documentId: options.documentId,
        locale,
        user: options.user,
      })
      return draftDoc ? mapDetail(draftDoc as Project) : null
    }
    // Draft mode drops the published-only filter and asks Payload for the
    // latest version. Access remains enforced for the authenticated user.
    const where: Where = { and: [PUBLISHED_WHERE, { slug: { equals: slug } }] }
    const result = await payload.find({
      collection: 'projects',
      where,
      limit: 1,
      depth: 1,
      locale,
      draft,
      overrideAccess: false,
      user: options.user,
    })

    const doc = result.docs[0] as Project | undefined
    return doc ? mapDetail(doc) : null
  } catch (err) {
    rethrowPayloadErrorInProduction(err)
    return null
  }
}
