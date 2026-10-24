import type { Locale } from '@/i18n/locale'
import type { StudentAffairsDocument } from '@/payload-types'

import { applyPublicCacheTags, collectionCacheTag } from './cache-tags'
import { PUBLISHED_WHERE } from './query-helpers'
import { getPayloadSafe, rethrowPayloadErrorInProduction } from './safe-payload'

export interface PublicStudentAffairsDocument {
  id: string
  title: string
  fileComingSoon: boolean
  downloadUrl: string | null
}

function hasFile(value: StudentAffairsDocument['file']): boolean {
  if (typeof value === 'number' || typeof value === 'string') return true
  return Boolean(value && typeof value === 'object' && value.id)
}

export async function getPublicStudentAffairsDocuments(
  options: { locale?: Locale } = {},
): Promise<PublicStudentAffairsDocument[]> {
  'use cache'

  applyPublicCacheTags(collectionCacheTag('student-affairs-documents'))

  const payload = await getPayloadSafe()
  if (!payload) return []

  try {
    const result = await payload.find({
      collection: 'student-affairs-documents',
      where: PUBLISHED_WHERE,
      sort: 'displayOrder',
      limit: 50,
      locale: options.locale ?? 'ar',
      depth: 0,
      draft: false,
      overrideAccess: false,
      select: {
        title: true,
        fileComingSoon: true,
        file: true,
      },
    })

    return (result.docs as StudentAffairsDocument[]).map((doc) => {
      const id = String(doc.id)
      const fileComingSoon = doc.fileComingSoon === true
      return {
        id,
        title: typeof doc.title === 'string' ? doc.title : '',
        fileComingSoon,
        downloadUrl:
          !fileComingSoon && hasFile(doc.file)
            ? `/api/public/student-affairs-documents/${encodeURIComponent(id)}/download`
            : null,
      }
    })
  } catch (error) {
    rethrowPayloadErrorInProduction(error)
    return []
  }
}
