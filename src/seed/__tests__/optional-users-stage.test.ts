import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { optionalUserFixtures } from '../fixtures/users'
import type { SeedOperations } from '../lib/local-api'
import type { SeedStageContext } from '../lib/types'
import { optionalUsersStage } from '../stages/optional-users'

const envNames = [
  'NODE_ENV',
  'SEED_DEMO_USERS',
  'SEED_COORDINATOR_COLLEGE_SLUG',
  ...optionalUserFixtures.flatMap(({ emailEnv, passwordEnv }) => [emailEnv, passwordEnv]),
] as const
const originalEnvironment = new Map<string, string | undefined>()

beforeEach(() => {
  for (const name of envNames) originalEnvironment.set(name, process.env[name])
  Object.assign(process.env, { NODE_ENV: 'test' })
  process.env.SEED_DEMO_USERS = 'true'
  for (const [index, fixture] of optionalUserFixtures.entries()) {
    process.env[fixture.emailEnv] = `seed-user-${index}@example.test`
    process.env[fixture.passwordEnv] = ['Runtime', String(index), 'Credential', '!'].join('')
  }
  process.env.SEED_COORDINATOR_COLLEGE_SLUG = 'medicine'
})

afterEach(() => {
  for (const name of envNames) {
    const value = originalEnvironment.get(name)
    if (value === undefined) Reflect.deleteProperty(process.env, name)
    else Reflect.set(process.env, name, value)
  }
  originalEnvironment.clear()
})

function contextWith(operations: Partial<SeedOperations>) {
  return {
    createBootstrapUser: vi.fn(),
    operations,
    payload: {},
    req: {},
    state: { created: new Map() },
  } as unknown as SeedStageContext
}

describe('optional users stage configuration', () => {
  it('requires the coordinator scope before any read or write', async () => {
    delete process.env.SEED_COORDINATOR_COLLEGE_SLUG
    const find = vi.fn()
    const create = vi.fn()

    await expect(optionalUsersStage.run(contextWith({ create, find }))).rejects.toThrow(
      'SEED_COORDINATOR_COLLEGE_SLUG',
    )
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('requires the coordinator password from its dedicated environment variable', async () => {
    delete process.env.SEED_COORDINATOR_PASSWORD
    const find = vi.fn()
    const create = vi.fn()

    await expect(optionalUsersStage.run(contextWith({ create, find }))).rejects.toThrow(
      'SEED_COORDINATOR_PASSWORD',
    )
    expect(find).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})
