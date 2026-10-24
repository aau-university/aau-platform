import type { PayloadRequest } from 'payload'

type ManagedRedirect = {
  disabled?: boolean | null
  from: string
  id: number | string
  managed?: boolean | null
  managedTargetCollection?: string | null
  managedTargetDocumentId?: string | null
  managedTargetRouteKey?: string | null
  to?: {
    type?: 'custom' | 'reference' | null
    url?: string | null
  } | null
}

type SyncManagedRedirectsArgs = {
  collection: string
  currentPath: string | null
  documentId: number | string
  isPublic: boolean
  previousPath: string | null
  req: PayloadRequest
  routeKey?: string
}

const INTERNAL_CONTEXT = { skipManagedRedirectLifecycle: true }

function isSafePath(path: string | null): path is string {
  return Boolean(
    path &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !path.includes('?') &&
      !path.includes('#'),
  )
}

async function findManagedForDocument(
  req: PayloadRequest,
  collection: string,
  documentId: number | string,
  routeKey: string,
): Promise<ManagedRedirect[]> {
  const result = await req.payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { managed: { equals: true } },
        { managedTargetCollection: { equals: collection } },
        { managedTargetDocumentId: { equals: String(documentId) } },
        { managedTargetRouteKey: { equals: routeKey } },
      ],
    },
  })
  return result.docs as unknown as ManagedRedirect[]
}

async function updateManagedRedirect(
  req: PayloadRequest,
  redirect: ManagedRedirect,
  data: Record<string, unknown>,
): Promise<void> {
  await req.payload.update({
    collection: 'redirects',
    context: INTERNAL_CONTEXT,
    data: data as never,
    id: redirect.id,
    overrideAccess: true,
    req,
  })
}

/**
 * Maintain direct, custom-path redirects for canonical route changes.
 *
 * Managed redirects retain their document identity while disabled, allowing
 * an unpublish/restore cycle to fail closed publicly and then restore the
 * historical redirects without losing the chain-flattening information.
 */
export async function syncManagedRedirects({
  collection,
  currentPath,
  documentId,
  isPublic,
  previousPath,
  req,
  routeKey = 'detail',
}: SyncManagedRedirectsArgs): Promise<void> {
  const managed = await findManagedForDocument(req, collection, documentId, routeKey)

  if (!isPublic || !isSafePath(currentPath)) {
    await Promise.all(
      managed
        .filter((redirect) => !redirect.disabled)
        .map((redirect) =>
          updateManagedRedirect(req, redirect, { disabled: true }),
        ),
    )
    return
  }

  // A canonical route must always win over a historical redirect. Removing a
  // managed row with the current path also prevents B→C→B loops on restores.
  const currentPathConflicts = await req.payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { from: { equals: currentPath } },
        { managed: { equals: true } },
      ],
    },
  })
  for (const conflict of currentPathConflicts.docs) {
    await req.payload.delete({
      collection: 'redirects',
      context: INTERNAL_CONTEXT,
      id: conflict.id,
      overrideAccess: true,
      req,
    })
  }

  // Flatten every historical A→B target directly to the current C path.
  for (const redirect of managed) {
    if (redirect.from === currentPath) continue
    await updateManagedRedirect(req, redirect, {
      disabled: false,
      to: { type: 'custom', url: currentPath },
    })
  }

  if (
    !isSafePath(previousPath) ||
    previousPath === '/' ||
    previousPath === currentPath
  ) {
    return
  }

  const existing = await req.payload.find({
    collection: 'redirects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: { from: { equals: previousPath } },
  })
  const match = existing.docs[0] as unknown as ManagedRedirect | undefined

  // Never overwrite an editor-authored redirect or one owned by another
  // document. The unique `from` constraint remains the final race guard.
  if (match && (!match.managed ||
      match.managedTargetCollection !== collection ||
      match.managedTargetDocumentId !== String(documentId) ||
      match.managedTargetRouteKey !== routeKey)) {
    return
  }

  // An owned historical row was already flattened in the loop above.
  if (match && managed.some((redirect) => redirect.id === match.id)) return

  const data = {
    disabled: false,
    from: previousPath,
    managed: true,
    managedTargetCollection: collection,
    managedTargetDocumentId: String(documentId),
    managedTargetRouteKey: routeKey,
    to: { type: 'custom', url: currentPath },
  }

  if (match) {
    await updateManagedRedirect(req, match, data)
  } else {
    await req.payload.create({
      collection: 'redirects',
      context: INTERNAL_CONTEXT,
      data: data as never,
      overrideAccess: true,
      req,
    })
  }
}
