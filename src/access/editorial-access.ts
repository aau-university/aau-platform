import type { CollectionConfig } from 'payload'

import { authenticatedOrPublished } from './authenticated-or-published'
import { coordinatorScopedRead } from './coordinator-scoped-read'
import { coordinatorScopedReadVersions } from './coordinator-scoped-read-versions'
import { coordinatorScopedCreate, coordinatorScopedUpdate } from './coordinator-scoped-update'
import { isContentManagerOrAbove } from './is-content-manager-or-above'

type EditorialAccess = NonNullable<CollectionConfig['access']>

/** Identical CRUD/version policy shared by unscoped editorial collections. */
export function contentManagerEditorialAccess(): EditorialAccess {
  return {
    create: isContentManagerOrAbove,
    read: authenticatedOrPublished,
    readVersions: isContentManagerOrAbove,
    update: isContentManagerOrAbove,
    delete: isContentManagerOrAbove,
  }
}

export interface CoordinatorEditorialAccessOptions {
  permission: string
  publishedRelations?: string[]
}

/** Identical CRUD/version policy shared by college-scoped editorial content. */
export function coordinatorEditorialAccess(
  options: CoordinatorEditorialAccessOptions,
): EditorialAccess {
  return {
    create: coordinatorScopedCreate({ permission: options.permission }),
    read: coordinatorScopedRead({
      permission: options.permission,
      publishedRelations: options.publishedRelations,
    }),
    readVersions: coordinatorScopedReadVersions({ permission: options.permission }),
    update: coordinatorScopedUpdate({ permission: options.permission }),
    delete: isContentManagerOrAbove,
  }
}
