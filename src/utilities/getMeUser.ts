import { cookies } from 'next/headers'
import { errors as joseErrors, jwtVerify } from 'jose'

import type { User } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

export interface MeUser {
  user: User
  token: string
}

/**
 * Resolve the currently authenticated Payload user from the `payload-token`
 * cookie. JWT verification is kept separate from the user lookup so invalid
 * credentials return null while database failures remain operational errors.
 *
 * Server-only — uses `next/headers` `cookies()` (async in Next 15+).
 */
export async function getMeUser(): Promise<MeUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null

  const payload = await getPayload({ config: configPromise })

  let claims: Awaited<ReturnType<typeof jwtVerify>>['payload']
  try {
    const result = await jwtVerify(token, new TextEncoder().encode(payload.secret), {
      algorithms: ['HS256'],
    })
    claims = result.payload
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return null
    throw error
  }

  if (
    claims.collection !== 'users' ||
    (typeof claims.id !== 'string' && typeof claims.id !== 'number')
  ) {
    return null
  }

  const result = await payload.find({
    collection: 'users',
    depth: 2,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { id: { equals: claims.id } },
  })
  const user = result.docs[0]
  if (!user) return null

  return {
    user: user as User,
    token,
  }
}

export default getMeUser
