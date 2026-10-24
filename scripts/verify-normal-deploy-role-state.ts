import { getPayload } from 'payload'

import config from '@payload-config'

if (process.env.VERIFY_NORMAL_DEPLOY_ROLE_STATE !== 'true') {
  throw new Error('This release-contract mutation requires VERIFY_NORMAL_DEPLOY_ROLE_STATE=true.')
}

const databaseURL = new URL(process.env.DATABASE_URI ?? '')
if (databaseURL.hostname !== 'postgres-prod' || databaseURL.pathname !== '/aau_platform') {
  throw new Error('Refusing release-contract mutation outside the disposable Compose database.')
}

const payload = await getPayload({ config })

try {
  const [users, roles] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [{ systemRole: { equals: 'super_admin' } }, { isActive: { equals: true } }],
      },
    }),
    payload.find({
      collection: 'roles',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: 'coordinator' } },
    }),
  ])
  const administrator = users.docs[0]
  const coordinator = roles.docs[0]
  if (!administrator || !coordinator) {
    throw new Error('Missing bootstrap administrator or Coordinator Role fixture.')
  }

  await payload.update({
    collection: 'roles',
    data: { canAccessRefine: coordinator.canAccessRefine !== true },
    id: coordinator.id,
    overrideAccess: false,
    user: administrator,
  })
} finally {
  await payload.destroy()
}
