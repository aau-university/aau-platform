import { inject } from 'vitest'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUri: string
    payloadSecret: string
    redisUrl: string
  }
}

const databaseUri = inject('databaseUri')

Object.assign(process.env, {
  DATABASE_URI: databaseUri,
  DATABASE_DIRECT_URI: databaseUri,
  REDIS_URL: inject('redisUrl'),
  PAYLOAD_SECRET: inject('payloadSecret'),
  PAYLOAD_DB_PUSH: 'false',
  S3_ENABLED: 'false',
  SEED_DEMO_USERS: 'false',
  INITIAL_ADMIN_EMAIL: 'admin@testcontainers.local',
  INITIAL_ADMIN_PASSWORD: 'Testcontainers-Admin-Password-2026!',
})
