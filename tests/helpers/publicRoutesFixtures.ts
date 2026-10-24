import type { Payload } from 'payload'

export const PUBLIC_ROUTES_FIXTURE = {
  draftPageSlug: 'pr25-sitemap-draft-only',
  nestedProgramNewPath: '/colleges/pr25-routes-college/programs/pr25-routes-program-new',
  nestedProgramOldPath: '/colleges/pr25-routes-college/programs/pr25-routes-program-old',
  publishedPageSlug: 'pr25-sitemap-published',
  simpleRedirectFrom: '/pr25-redirect-old',
  simpleRedirectTo: '/pr25-redirect-new',
} as const

const FIXTURE_CONTEXT = { disableRevalidate: true } as const

function richTextBlock(heading: string) {
  return {
    blockType: 'richText' as const,
    heading,
  }
}

/** Create deterministic fixtures before any public cache has been warmed. */
export async function createPublicRoutesFixtures(payload: Payload): Promise<void> {
  await deletePublicRoutesFixtures(payload)

  try {
    await payload.create({
      collection: 'pages',
      context: FIXTURE_CONTEXT,
      data: {
        _status: 'published',
        layout: [richTextBlock('PR25 sitemap published fixture')],
        slug: PUBLIC_ROUTES_FIXTURE.publishedPageSlug,
        title: 'PR25 sitemap published fixture',
      },
      locale: 'en',
      overrideAccess: true,
    })

    await payload.create({
      collection: 'pages',
      context: FIXTURE_CONTEXT,
      data: {
        _status: 'draft',
        layout: [richTextBlock('PR25 sitemap draft fixture')],
        slug: PUBLIC_ROUTES_FIXTURE.draftPageSlug,
        title: 'PR25 sitemap draft fixture',
      },
      draft: true,
      locale: 'en',
      overrideAccess: true,
    })

    const redirects = [
      {
        from: PUBLIC_ROUTES_FIXTURE.simpleRedirectFrom,
        to: PUBLIC_ROUTES_FIXTURE.simpleRedirectTo,
      },
      {
        from: PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath,
        to: PUBLIC_ROUTES_FIXTURE.nestedProgramNewPath,
      },
      {
        from: `${PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath}/study-plan`,
        to: `${PUBLIC_ROUTES_FIXTURE.nestedProgramNewPath}/study-plan`,
      },
    ]

    for (const redirect of redirects) {
      await payload.create({
        collection: 'redirects',
        context: FIXTURE_CONTEXT,
        data: {
          from: redirect.from,
          to: {
            type: 'custom',
            url: redirect.to,
          },
        },
        overrideAccess: true,
      })
    }
  } catch (error) {
    await deletePublicRoutesFixtures(payload)
    throw error
  }
}

export async function deletePublicRoutesFixtures(payload: Payload): Promise<void> {
  const redirects = await payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    where: {
      or: [
        { from: { equals: PUBLIC_ROUTES_FIXTURE.simpleRedirectFrom } },
        { from: { equals: PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath } },
        {
          from: {
            equals: `${PUBLIC_ROUTES_FIXTURE.nestedProgramOldPath}/study-plan`,
          },
        },
      ],
    },
  })

  for (const redirect of redirects.docs) {
    await payload.delete({
      collection: 'redirects',
      context: FIXTURE_CONTEXT,
      id: redirect.id,
      overrideAccess: true,
    })
  }

  const pages = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    limit: 20,
    overrideAccess: true,
    where: {
      or: [
        { slug: { equals: PUBLIC_ROUTES_FIXTURE.publishedPageSlug } },
        { slug: { equals: PUBLIC_ROUTES_FIXTURE.draftPageSlug } },
      ],
    },
  })

  for (const page of pages.docs) {
    await payload.delete({
      collection: 'pages',
      context: FIXTURE_CONTEXT,
      id: page.id,
      overrideAccess: true,
    })
  }
}
