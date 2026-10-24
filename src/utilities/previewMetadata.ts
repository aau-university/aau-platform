import type { Metadata } from 'next'

/** Keep preview metadata private and avoid advertising a draft as canonical. */
export function asPreviewMetadata(metadata: Metadata, draft: boolean): Metadata {
  if (!draft) return metadata

  const { alternates: _alternates, ...rest } = metadata
  const openGraph = metadata.openGraph
    ? { ...metadata.openGraph, url: undefined }
    : undefined

  return {
    ...rest,
    openGraph,
    robots: {
      follow: false,
      index: false,
    },
  }
}
