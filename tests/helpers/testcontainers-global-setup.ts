import { execFileSync } from 'node:child_process'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers'
import type { GlobalSetupContext } from 'vitest/node'

let postgres: StartedPostgreSqlContainer | undefined
let redis: StartedTestContainer | undefined

export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  try {
    postgres = await new PostgreSqlContainer('postgres:18.6-bookworm')
      .withDatabase('aau_fixes_payload_test')
      .withUsername('payload')
      .withPassword('payload')
      .withStartupTimeout(120_000)
      .start()

    redis = await new GenericContainer('redis:8.8.2-trixie')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .withStartupTimeout(120_000)
      .start()

    const databaseURL = postgres.getConnectionUri()
    const redisURL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`
    const payloadSecret = 'testcontainers-payload-secret-at-least-32-characters'
    Object.assign(process.env, {
      DATABASE_URI: databaseURL,
      DATABASE_DIRECT_URI: databaseURL,
      REDIS_URL: redisURL,
      PAYLOAD_SECRET: payloadSecret,
      PAYLOAD_DB_PUSH: 'false',
      S3_ENABLED: 'false',
    })

    const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    execFileSync(executable, ['payload', 'migrate'], {
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      timeout: 180_000,
    })

    provide('databaseUri', databaseURL)
    provide('redisUrl', redisURL)
    provide('payloadSecret', payloadSecret)
  } catch (error) {
    await teardown()
    throw error
  }
}

export async function teardown(): Promise<void> {
  await Promise.allSettled([redis?.stop(), postgres?.stop()])
}
