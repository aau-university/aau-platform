import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/payload/preview-session', () => ({
  PREVIEW_SESSION_QUERY: 'previewSession',
  createOrReusePreviewSession: vi.fn().mockResolvedValue('opaque-token'),
}))

import {
  buildAcademicProgramPath,
  buildCollectionPath,
  buildCollegeFacultyPath,
  buildStudyPlanPath,
  buildStudyPlanPathFromProgramPath,
  COLLECTION_ROUTE_RESOLVERS,
  COLLECTION_ROUTE_PREFIXES,
  COLLECTIONS_REQUIRING_PARENT,
  hasCollectionDetailRoute,
  isRoutedCollection,
  resolveCollectionPath,
  resolveCollectionPathWithRelationships,
  resolveCollectionRevalidationPaths,
} from '../collectionRoutes'

describe('buildCollectionPath', () => {
  // Regression: `generateMeta` special-cased only `blog-posts`, so every
  // news/event/college/faculty page advertised a canonical and og:url with
  // the prefix missing — a URL that 404s, and one that could collide with a
  // `pages` document sharing the slug.
  it('prefixes every routed collection, not just blog posts', () => {
    expect(buildCollectionPath('news', 'career-fair-2025')).toBe('/news/career-fair-2025')
    expect(buildCollectionPath('events', 'open-day')).toBe('/events/open-day')
    expect(buildCollectionPath('colleges', 'medicine')).toBe('/colleges/medicine')
    expect(buildCollectionPath('faculty-members', 'dr-samira')).toBe('/faculty/dr-samira')
    expect(buildCollectionPath('blog-posts', 'hello')).toBe('/blog/hello')
  })

  it('keeps the non-obvious prefixes that differ from the collection slug', () => {
    expect(buildCollectionPath('projects', 'solar')).toBe('/projects-studio/solar')
    expect(buildCollectionPath('research-publications', 'paper')).toBe('/research/articles/paper')
    expect(buildCollectionPath('campus-life', 'clubs')).toBe('/campus-life/clubs')
  })

  it('returns null for collections with no public slug route so callers can fall back', () => {
    expect(buildCollectionPath('users', 'someone')).toBeNull()
    expect(buildCollectionPath('media', 'file')).toBeNull()
  })

  // The project has a `/faq` list page and NO per-FAQ detail route, so a
  // `/faqs/<slug>` canonical pointed at a path that never existed. A prefix
  // with no route is worse than no prefix at all.
  it('does not invent a route for FAQs, which have no detail page', () => {
    expect(buildCollectionPath('faqs', 'how-do-i-apply')).toBeNull()
    expect(isRoutedCollection('faqs')).toBe(false)
    expect(Object.keys(COLLECTION_ROUTE_PREFIXES)).not.toContain('faqs')
  })
})

describe('the `home` slug', () => {
  // `home` is the identity of the root PAGE. Applying it to every collection
  // sent a news article legitimately slugged "home" to `/news`, silently
  // canonicalising it onto the news index instead of its own URL.
  it('maps to the site root for pages only', () => {
    expect(buildCollectionPath('pages', 'home')).toBe('/')
    expect(buildCollectionPath('pages', '')).toBeNull()
    expect(buildCollectionPath('pages', null)).toBeNull()
    expect(buildCollectionPath('pages', 'about')).toBe('/about')
  })

  it('is an ordinary slug for every other collection', () => {
    expect(buildCollectionPath('news', 'home')).toBe('/news/home')
    expect(buildCollectionPath('blog-posts', 'home')).toBe('/blog/home')
    expect(buildCollectionPath('colleges', 'home')).toBe('/colleges/home')
    expect(buildCollectionPath('events', 'home')).toBe('/events/home')
  })

  // A slug-less document has no address. Returning the index would make every
  // slug-less news document declare `/news` as its canonical, collapsing them
  // all onto the index in search results.
  it('refuses to resolve a slug-less document to the collection index', () => {
    expect(buildCollectionPath('news', '')).toBeNull()
    expect(buildCollectionPath('news', '   ')).toBeNull()
    expect(buildCollectionPath('offers', null)).toBeNull()
  })
})

describe('parent-scoped routes', () => {
  // A program lives at /colleges/<collegeSlug>/programs/<slug>. Returning a
  // single-segment guess would emit a canonical that 404s, so the table
  // refuses and callers must use the dedicated builders.
  it('refuses to guess a path for collections that need a parent segment', () => {
    expect(buildCollectionPath('academic-programs', 'software')).toBeNull()
    expect(buildCollectionPath('study-plans', 'anything')).toBeNull()
    expect(isRoutedCollection('academic-programs')).toBe(true)
    expect(isRoutedCollection('study-plans')).toBe(true)
    expect(COLLECTIONS_REQUIRING_PARENT.has('academic-programs')).toBe(true)
    expect(COLLECTIONS_REQUIRING_PARENT.has('study-plans')).toBe(true)
  })

  it('builds the full college-scoped program path', () => {
    expect(buildAcademicProgramPath('medicine', 'software')).toBe(
      '/colleges/medicine/programs/software',
    )
  })

  it('builds the study-plan path under its program', () => {
    expect(buildStudyPlanPath('medicine', 'software')).toBe(
      '/colleges/medicine/programs/software/study-plan',
    )
    expect(
      buildStudyPlanPathFromProgramPath('/colleges/medicine/programs/software'),
    ).toBe('/colleges/medicine/programs/software/study-plan')
  })

  it('builds the college-scoped faculty directory path', () => {
    expect(buildCollegeFacultyPath('medicine')).toBe('/colleges/medicine/faculty')
  })

  it('returns null rather than a half-built path when a segment is missing', () => {
    expect(buildAcademicProgramPath('', 'software')).toBeNull()
    expect(buildAcademicProgramPath('medicine', '')).toBeNull()
    expect(buildAcademicProgramPath(null, null)).toBeNull()
    expect(buildStudyPlanPath('medicine', null)).toBeNull()
    expect(buildCollegeFacultyPath(null)).toBeNull()
  })

  it('tolerates segments that arrive with stray slashes', () => {
    expect(buildAcademicProgramPath('/medicine/', '/software/')).toBe(
      '/colleges/medicine/programs/software',
    )
  })

  it('resolves nested paths from populated Payload relationships', () => {
    expect(
      resolveCollectionPath('academic-programs', {
        slug: 'software',
        college: { id: 1, slug: 'engineering' },
      }),
    ).toBe('/colleges/engineering/programs/software')
    expect(
      resolveCollectionPath('study-plans', {
        college: { id: 1, slug: 'engineering' },
        academicProgram: { id: 2, slug: 'software' },
      }),
    ).toBe('/colleges/engineering/programs/software/study-plan')
  })

  it('includes dependent routes in collection revalidation paths', () => {
    expect(
      resolveCollectionRevalidationPaths('colleges', { slug: 'engineering' }),
    ).toEqual([
      '/colleges/engineering',
      '/colleges/engineering/faculty',
    ])
    // Study Plans own their route and redirect lifecycle. A Program mutation
    // discovers affected plan documents rather than claiming a second route.
    expect(
      resolveCollectionRevalidationPaths('academic-programs', {
        slug: 'software',
        college: { slug: 'engineering' },
      }),
    ).toEqual(['/colleges/engineering/programs/software'])
  })

  it('fetches only missing relation slugs for hook documents', async () => {
    const lookup = vi.fn(async (collection: string) =>
      collection === 'colleges' ? 'engineering' : 'software',
    )

    await expect(
      resolveCollectionPathWithRelationships(
        'study-plans',
        { college: 1, academicProgram: 2 },
        lookup,
      ),
    ).resolves.toBe('/colleges/engineering/programs/software/study-plan')
    expect(lookup).toHaveBeenCalledTimes(2)
  })
})

describe('route table integrity', () => {
  it('distinguishes simple, nested, and intentional no-detail routes', () => {
    expect(COLLECTION_ROUTE_RESOLVERS.pages).toMatchObject({
      kind: 'simple',
      rootSlug: 'home',
    })
    expect(COLLECTION_ROUTE_RESOLVERS['academic-programs']).toMatchObject({
      kind: 'nested',
    })
    expect(COLLECTION_ROUTE_RESOLVERS.faqs).toEqual({ kind: 'no-detail' })
    expect(hasCollectionDetailRoute('faqs')).toBe(false)
    expect(resolveCollectionPath('faqs', { slug: 'question' })).toBeNull()
  })

  it('never emits a double slash', () => {
    for (const collection of Object.keys(COLLECTION_ROUTE_PREFIXES)) {
      const result = buildCollectionPath(collection, 'some-slug')
      expect(result).not.toBeNull()
      expect(result).not.toMatch(/\/\//)
      expect(result!.startsWith('/')).toBe(true)
    }
  })

  // The guard that would have caught the `/faqs` mistake: every prefix must
  // correspond to a real `[slug]` route on disk. Adding a prefix without a
  // page now fails here instead of shipping a canonical that 404s.
  it('has a real [slug] detail route on disk for every prefix', () => {
    const frontendRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'app',
      '(frontend)',
    )

    for (const [collection, prefix] of Object.entries(COLLECTION_ROUTE_PREFIXES)) {
      const routeDir = path.join(frontendRoot, prefix, '[slug]')
      expect(
        existsSync(path.join(routeDir, 'page.tsx')),
        `${collection} maps to "${prefix}" but ${prefix}/[slug]/page.tsx does not exist`,
      ).toBe(true)
    }
  })
})

// End-to-end coverage at the two layers that actually ship URLs, not just the
// helper. All three reported defects were invisible to helper-level tests
// because the buggy short-circuits lived in these callers.
describe('generateMeta canonical (end-to-end)', () => {
  it('emits the full nested path for an academic program from the registry relations', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: {
        title: 'Software Engineering',
        slug: 'software',
        college: { slug: 'medicine' },
      } as never,
      collectionSlug: 'academic-programs',
    })

    expect(meta.alternates?.canonical).toMatch(/\/colleges\/medicine\/programs\/software$/)
    expect(meta.openGraph?.url).toMatch(/\/colleges\/medicine\/programs\/software$/)
  })

  it('emits the registered college faculty dependent route', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: {
        title: 'Faculty Directory',
        slug: 'medicine',
        dependentSegment: 'faculty',
      },
      collectionSlug: 'colleges',
    })

    expect(meta.alternates?.canonical).toMatch(/\/colleges\/medicine\/faculty$/)
    expect(meta.openGraph?.url).toMatch(/\/colleges\/medicine\/faculty$/)
  })

  it('rejects an unregistered dependent route instead of accepting a free-form path', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: {
        title: 'Invented Route',
        slug: 'medicine',
        dependentSegment: 'invented',
      },
      collectionSlug: 'colleges',
    })

    expect(meta.alternates?.canonical).toBeUndefined()
    expect(meta.openGraph?.url).toBeUndefined()
  })

  it('does not let a free-form path bypass the collection route registry', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: {
        title: 'Medicine',
        slug: 'medicine',
        path: '/invented',
      },
      collectionSlug: 'colleges',
    })

    expect(meta.alternates?.canonical).toMatch(/\/colleges\/medicine$/)
    expect(meta.openGraph?.url).toMatch(/\/colleges\/medicine$/)
  })

  it('emits NO canonical for a parent-scoped collection missing its relation', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: { title: 'Software Engineering', slug: 'software' } as never,
      collectionSlug: 'academic-programs',
    })

    // Fail closed: previously this produced `<base>/software`, a URL that 404s.
    expect(meta.alternates?.canonical).toBeUndefined()
  })

  it('does not send a non-page document slugged "home" to the site root', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: { title: 'Home', slug: 'home' } as never,
      collectionSlug: 'news',
    })

    expect(meta.alternates?.canonical).toMatch(/\/news\/home$/)
  })

  it('still maps the root page to the site root', async () => {
    const { default: generateMeta } = await import('../generateMeta')

    const meta = await generateMeta({
      doc: { title: 'Home', slug: 'home' } as never,
      collectionSlug: 'pages',
    })

    expect(meta.alternates?.canonical).toMatch(/\/$/)
  })
})

describe('generatePreviewPath (end-to-end)', () => {
  it('binds a non-page document slugged "home" by id', async () => {
    const { generatePreviewPath } = await import('../generatePreviewPath')
    const url = await generatePreviewPath({
      authSessionId: 'session-1',
      collection: 'news',
      data: { id: 10, slug: 'home' },
      req: { locale: 'ar', payload: { logger: {} } } as never,
      userId: 5,
    })
    expect(url).toContain('previewSession=')
  })

  it('binds the root page by id instead of trusting its path', async () => {
    const { generatePreviewPath } = await import('../generatePreviewPath')
    const url = await generatePreviewPath({
      authSessionId: 'session-1',
      collection: 'pages',
      data: { id: 1, slug: 'home' },
      req: { locale: 'ar', payload: { logger: {} } } as never,
      userId: 5,
    })
    expect(url).toContain('previewSession=')
  })
})
