import type { Payload } from 'payload'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  }, 30000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  }, 30000)
})
