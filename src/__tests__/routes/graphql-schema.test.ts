import { describe, expect, it } from 'vitest'

import configPromise from '@/payload.config'

describe('GraphQL surface', () => {
  it('is disabled through Payload configuration', async () => {
    const config = await configPromise

    expect(config.graphQL.disable).toBe(true)
  })
})
