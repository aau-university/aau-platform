import type { Payload } from 'payload'

export const PREVIEW_FIXTURE = {
  draftHome: 'PR25 Draft Home B',
  dynamicDraftTitle: 'PR25 Dynamic Draft B',
  dynamicNewSlug: 'pr25-preview-new',
  dynamicOldSlug: 'pr25-preview-old',
  publicHome: 'PR25 Published Home A',
} as const

const FIXTURE_CONTEXT = { disableRevalidate: true } as const

export async function createPreviewFixtures(payload: Payload): Promise<void> {
  await deletePreviewFixtures(payload)

  const home = await payload.create({
    collection: 'pages',
    context: FIXTURE_CONTEXT,
    data: {
      _status: 'published',
      layout: [heroBlock(PREVIEW_FIXTURE.publicHome)],
      slug: 'home',
      title: PREVIEW_FIXTURE.publicHome,
    },
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'pages',
    context: FIXTURE_CONTEXT,
    data: {
      _status: 'draft',
      layout: [heroBlock(PREVIEW_FIXTURE.draftHome)],
      slug: 'home',
      title: PREVIEW_FIXTURE.draftHome,
    },
    draft: true,
    id: home.id,
    locale: 'ar',
    overrideAccess: true,
  })

  const dynamicPage = await payload.create({
    collection: 'pages',
    context: FIXTURE_CONTEXT,
    data: {
      _status: 'published',
      layout: [richTextBlock('PR25 Dynamic Published A')],
      slug: PREVIEW_FIXTURE.dynamicOldSlug,
      title: 'PR25 Dynamic Published A',
    },
    locale: 'ar',
    overrideAccess: true,
  })
  await payload.update({
    collection: 'pages',
    context: FIXTURE_CONTEXT,
    data: {
      _status: 'draft',
      layout: [richTextBlock(PREVIEW_FIXTURE.dynamicDraftTitle)],
      slug: PREVIEW_FIXTURE.dynamicNewSlug,
      title: PREVIEW_FIXTURE.dynamicDraftTitle,
    },
    draft: true,
    id: dynamicPage.id,
    locale: 'ar',
    overrideAccess: true,
  })
}

export async function deletePreviewFixtures(payload: Payload): Promise<void> {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    limit: 10,
    overrideAccess: true,
    where: {
      or: [
        { slug: { equals: 'home' } },
        { slug: { equals: PREVIEW_FIXTURE.dynamicOldSlug } },
        { slug: { equals: PREVIEW_FIXTURE.dynamicNewSlug } },
      ],
    },
  })

  for (const doc of result.docs) {
    await payload.delete({
      collection: 'pages',
      context: FIXTURE_CONTEXT,
      id: doc.id,
      overrideAccess: true,
    })
  }
}

export async function findPreviewFixtureIDs(payload: Payload): Promise<{
  dynamicPageID: number | string
  homeID: number | string
}> {
  const [home, dynamicPage] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: 'home' } },
    }),
    payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: PREVIEW_FIXTURE.dynamicNewSlug } },
    }),
  ])

  const homeID = home.docs[0]?.id
  const dynamicPageID = dynamicPage.docs[0]?.id
  if (homeID == null || dynamicPageID == null) {
    throw new Error('Preview E2E fixtures were not initialized.')
  }
  return { dynamicPageID, homeID }
}

function heroBlock(titlePrimary: string) {
  return {
    blockType: 'hero' as const,
    titlePrimary,
    titleSecondary: 'PR25',
  }
}

function richTextBlock(heading: string) {
  return {
    blockType: 'richText' as const,
    heading,
  }
}
