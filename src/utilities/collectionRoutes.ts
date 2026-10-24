import type { CollectionSlug } from 'payload'

type RouteDocument = Record<string, unknown>

type RouteRelation = 'academicProgram' | 'college'

type NestedRouteContext = {
  doc: RouteDocument
  relationSlugs: Partial<Record<RouteRelation, string>>
}

type SimpleRouteDefinition = {
  dependentSegments?: readonly string[]
  kind: 'simple'
  prefix: string
  rootSlug?: string
}

type NestedRouteDefinition = {
  dependentSegments?: readonly string[]
  kind: 'nested'
  relations: readonly {
    collection: 'academic-programs' | 'colleges'
    field: RouteRelation
  }[]
  resolve: (context: NestedRouteContext) => string | null
}

type NoDetailRouteDefinition = {
  kind: 'no-detail'
}

export type CollectionRouteDefinition =
  | SimpleRouteDefinition
  | NestedRouteDefinition
  | NoDetailRouteDefinition

/**
 * Public detail-route registry.
 *
 * `no-detail` entries are intentional: their data can appear on public list
 * pages, but individual documents do not own a URL. Nested entries declare
 * the relationships required to resolve their route. Preview, metadata, and
 * cache revalidation all consume this registry.
 */
export const COLLECTION_ROUTE_RESOLVERS = {
  pages: { kind: 'simple', prefix: '', rootSlug: 'home' },
  news: { kind: 'simple', prefix: '/news' },
  events: { kind: 'simple', prefix: '/events' },
  'blog-posts': { kind: 'simple', prefix: '/blog' },
  colleges: {
    kind: 'simple',
    prefix: '/colleges',
    dependentSegments: ['faculty'],
  },
  'faculty-members': { kind: 'simple', prefix: '/faculty' },
  centers: { kind: 'simple', prefix: '/centers' },
  offers: { kind: 'simple', prefix: '/offers' },
  'campus-life': { kind: 'simple', prefix: '/campus-life' },
  projects: { kind: 'simple', prefix: '/projects-studio' },
  'research-publications': { kind: 'simple', prefix: '/research/articles' },
  'academic-programs': {
    kind: 'nested',
    relations: [{ field: 'college', collection: 'colleges' }],
    resolve: ({ doc, relationSlugs }) =>
      buildAcademicProgramPath(
        relationSlugs.college,
        typeof doc.slug === 'string' ? doc.slug : undefined,
      ),
  },
  'study-plans': {
    kind: 'nested',
    relations: [
      { field: 'college', collection: 'colleges' },
      { field: 'academicProgram', collection: 'academic-programs' },
    ],
    resolve: ({ relationSlugs }) =>
      buildStudyPlanPath(relationSlugs.college, relationSlugs.academicProgram),
  },
  'academic-departments': { kind: 'no-detail' },
  announcements: { kind: 'no-detail' },
  'admission-requirements': { kind: 'no-detail' },
  categories: { kind: 'no-detail' },
  faqs: { kind: 'no-detail' },
  media: { kind: 'no-detail' },
  'navigation-menus': { kind: 'no-detail' },
  partners: { kind: 'no-detail' },
  sliders: { kind: 'no-detail' },
  'student-affairs-documents': { kind: 'no-detail' },
  'team-members': { kind: 'no-detail' },
} as const satisfies Partial<Record<CollectionSlug, CollectionRouteDefinition>>

export type RegisteredRouteCollection = keyof typeof COLLECTION_ROUTE_RESOLVERS

export type RoutedCollection = {
  [Collection in RegisteredRouteCollection]:
    (typeof COLLECTION_ROUTE_RESOLVERS)[Collection]['kind'] extends 'no-detail'
      ? never
      : Collection
}[RegisteredRouteCollection]

/** Collections that own a public detail route, derived from the registry. */
export const ROUTED_COLLECTION_SLUGS = Object.freeze(
  Object.entries(COLLECTION_ROUTE_RESOLVERS)
    .filter(([, route]) => route.kind !== 'no-detail')
    .map(([collection]) => collection as RoutedCollection),
)

function simpleRoutePrefixes(): Readonly<Partial<Record<CollectionSlug, string>>> {
  const prefixes: Partial<Record<CollectionSlug, string>> = {}
  for (const [collection, route] of Object.entries(COLLECTION_ROUTE_RESOLVERS)) {
    if (route.kind === 'simple') {
      prefixes[collection as CollectionSlug] = route.prefix
    }
  }
  return Object.freeze(prefixes)
}

export const COLLECTION_ROUTE_PREFIXES = simpleRoutePrefixes()

export const COLLECTIONS_REQUIRING_PARENT: ReadonlySet<string> = new Set(
  Object.entries(COLLECTION_ROUTE_RESOLVERS)
    .filter(([, route]) => route.kind === 'nested')
    .map(([collection]) => collection),
)

export function isRegisteredRouteCollection(
  collection: string,
): collection is RegisteredRouteCollection {
  return collection in COLLECTION_ROUTE_RESOLVERS
}

export function isRoutedCollection(collection: string): boolean {
  return (
    isRegisteredRouteCollection(collection) &&
    COLLECTION_ROUTE_RESOLVERS[collection].kind !== 'no-detail'
  )
}

export function hasCollectionDetailRoute(collection: string): boolean {
  return isRoutedCollection(collection)
}

function normalizeSegment(value?: string | null): string {
  return typeof value === 'string' ? value.trim().replace(/^\/+|\/+$/g, '') : ''
}

function relationshipSlug(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const slug = (value as { slug?: unknown }).slug
  return typeof slug === 'string' ? normalizeSegment(slug) || undefined : undefined
}

function relationshipID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  const id = (value as { id?: unknown }).id
  return typeof id === 'number' || typeof id === 'string' ? id : undefined
}

function buildSimplePath(
  route: SimpleRouteDefinition,
  slug?: string | null,
): string | null {
  const cleanSlug = normalizeSegment(slug)
  if (route.rootSlug && cleanSlug === route.rootSlug) return '/'
  if (!cleanSlug) return null
  return `${route.prefix}/${cleanSlug}`
}

export function buildCollectionPath(
  collection: string,
  slug?: string | null,
): string | null {
  if (!isRegisteredRouteCollection(collection)) return null
  const route = COLLECTION_ROUTE_RESOLVERS[collection]
  return route.kind === 'simple' ? buildSimplePath(route, slug) : null
}

export function buildAcademicProgramPath(
  collegeSlug?: string | null,
  programSlug?: string | null,
): string | null {
  const college = normalizeSegment(collegeSlug)
  const program = normalizeSegment(programSlug)
  if (!college || !program) return null
  return `/colleges/${college}/programs/${program}`
}

export function buildStudyPlanPath(
  collegeSlug?: string | null,
  programSlug?: string | null,
): string | null {
  const programPath = buildAcademicProgramPath(collegeSlug, programSlug)
  return buildStudyPlanPathFromProgramPath(programPath)
}

export function buildStudyPlanPathFromProgramPath(
  programPath?: string | null,
): string | null {
  const normalized = normalizeSegment(programPath)
  return normalized ? `/${normalized}/study-plan` : null
}

export function buildCollegeFacultyPath(collegeSlug?: string | null): string | null {
  const college = normalizeSegment(collegeSlug)
  return college ? `/colleges/${college}/faculty` : null
}

/**
 * Resolve a path from a document whose route relationships are populated.
 * This is the preview/canonical fast path and never performs data access.
 */
export function resolveCollectionPath(
  collection: string,
  doc: RouteDocument,
): string | null {
  if (!isRegisteredRouteCollection(collection)) return null
  const route = COLLECTION_ROUTE_RESOLVERS[collection]

  if (route.kind === 'no-detail') return null
  if (route.kind === 'simple') {
    return buildSimplePath(route, typeof doc.slug === 'string' ? doc.slug : undefined)
  }

  const relationSlugs: Partial<Record<RouteRelation, string>> = {
    college: relationshipSlug(doc.college),
    academicProgram: relationshipSlug(doc.academicProgram),
  }
  return route.resolve({ doc, relationSlugs })
}

/**
 * Resolve a registered child page owned by a collection document.
 *
 * The segment must be declared by that collection's route definition. This
 * keeps metadata and links from accepting arbitrary path strings while still
 * supporting real dependent pages such as `/colleges/<slug>/faculty`.
 */
export function resolveCollectionDependentPath(
  collection: string,
  dependentSegment: string,
  doc: RouteDocument,
): string | null {
  if (!isRegisteredRouteCollection(collection)) return null
  const route = COLLECTION_ROUTE_RESOLVERS[collection]
  if (route.kind === 'no-detail') return null

  const segment = normalizeSegment(dependentSegment)
  const registeredSegments =
    'dependentSegments' in route ? route.dependentSegments : undefined
  if (!segment || !registeredSegments?.some((registered) => registered === segment)) {
    return null
  }

  const parentPath = resolveCollectionPath(collection, doc)
  return parentPath ? `${parentPath}/${segment}` : null
}

export type ResolveRelationSlug = (
  collection: 'academic-programs' | 'colleges',
  id: number | string,
) => Promise<string | null>

/**
 * Resolve a hook document path, fetching only missing relationship slugs.
 * Payload hook documents are not guaranteed to populate relationships.
 */
export async function resolveCollectionPathWithRelationships(
  collection: string,
  doc: RouteDocument,
  resolveRelationSlug: ResolveRelationSlug,
): Promise<string | null> {
  const direct = resolveCollectionPath(collection, doc)
  if (direct || !isRegisteredRouteCollection(collection)) return direct

  const route = COLLECTION_ROUTE_RESOLVERS[collection]
  if (route.kind !== 'nested') return null

  const relationSlugs: Partial<Record<RouteRelation, string>> = {
    college: relationshipSlug(doc.college),
    academicProgram: relationshipSlug(doc.academicProgram),
  }

  for (const relation of route.relations) {
    if (relationSlugs[relation.field]) continue
    const id = relationshipID(doc[relation.field])
    if (id == null) return null
    relationSlugs[relation.field] =
      (await resolveRelationSlug(relation.collection, id)) ?? undefined
  }

  return route.resolve({ doc, relationSlugs })
}

function withDependentSegments(
  route: SimpleRouteDefinition | NestedRouteDefinition,
  path: string | null,
): string[] {
  if (!path) return []
  return [
    path,
    ...(route.dependentSegments ?? []).map(
      (segment) => `${path}/${normalizeSegment(segment)}`,
    ),
  ]
}

export function resolveCollectionRevalidationPaths(
  collection: string,
  doc: RouteDocument,
): string[] {
  if (!isRegisteredRouteCollection(collection)) return []
  const route = COLLECTION_ROUTE_RESOLVERS[collection]
  if (route.kind === 'no-detail') return []
  return withDependentSegments(route, resolveCollectionPath(collection, doc))
}

export async function resolveCollectionRevalidationPathsWithRelationships(
  collection: string,
  doc: RouteDocument,
  resolveRelationSlug: ResolveRelationSlug,
): Promise<string[]> {
  if (!isRegisteredRouteCollection(collection)) return []
  const route = COLLECTION_ROUTE_RESOLVERS[collection]
  if (route.kind === 'no-detail') return []
  const path = await resolveCollectionPathWithRelationships(
    collection,
    doc,
    resolveRelationSlug,
  )
  return withDependentSegments(route, path)
}
