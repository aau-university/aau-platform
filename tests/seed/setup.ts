import { Client } from 'pg'
import { assertLocalDatabaseURL } from '../helpers/e2eSafety'

import {
  assertFacultyCollegeNullable,
  assertRequiredSeedTables,
  requiredSeedTables,
} from './schema-guard'

const databaseUri = process.env.DATABASE_DIRECT_URI || process.env.DATABASE_URI

if (!databaseUri) {
  throw new Error('The Testcontainers PostgreSQL connection is required for test:seed.')
}
const configuredDatabaseURL = assertLocalDatabaseURL(databaseUri, 'Testcontainers database URI')
const expectedDatabase = decodeURIComponent(configuredDatabaseURL.pathname.slice(1))
if (!expectedDatabase.startsWith('aau_fixes_')) {
  throw new Error('The Testcontainers database name must start with "aau_fixes_".')
}

const client = new Client({ connectionString: databaseUri })
await client.connect()
try {
  const result = await client.query<{ database: string }>('SELECT current_database() AS database')
  if (result.rows[0]?.database !== expectedDatabase) {
    throw new Error('The PostgreSQL connection does not match its Testcontainers database URL.')
  }

  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])`,
    [requiredSeedTables],
  )
  assertRequiredSeedTables(tables.rows.map(({ table_name }) => table_name))

  const facultyCollege = await client.query<{ is_nullable: string }>(
    `SELECT is_nullable
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'faculty_members'
        AND column_name = 'college_id'`,
  )
  assertFacultyCollegeNullable(facultyCollege.rows[0])
} finally {
  await client.end()
}

process.env.DATABASE_URI = databaseUri
process.env.DATABASE_DIRECT_URI = databaseUri
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.S3_ENABLED = 'false'
process.env.SEED_DEMO_USERS = 'false'
