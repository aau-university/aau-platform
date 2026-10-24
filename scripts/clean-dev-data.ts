import 'dotenv/config'
import { Client } from 'pg'

/**
 * Drop and recreate only the explicitly named local Docker database.
 *
 * This intentionally uses pg directly so it can reset a database before
 * Payload initializes its schema. It must never be usable against a remote
 * database or a production process.
 */
async function resetLocalDatabase() {
  if (
    process.env.APP_ENV !== 'local-docker' ||
    process.env.NODE_ENV !== 'development' ||
    process.env.RESET_LOCAL_DB !== 'true' ||
    process.env.RESET_LOCAL_DB_CONFIRM !== 'aau_platform'
  ) {
    throw new Error('Local DB reset requires APP_ENV=local-docker, development mode, RESET_LOCAL_DB=true, and the exact confirmation value.')
  }

  const rawConnectionString = process.env.DATABASE_DIRECT_URI
  if (!rawConnectionString) throw new Error('DATABASE_DIRECT_URI is required.')

  const connection = new URL(rawConnectionString)
  const database = decodeURIComponent(connection.pathname.slice(1))
  if (
    connection.protocol !== 'postgres:' &&
    connection.protocol !== 'postgresql:'
  ) {
    throw new Error('Local DB reset requires a PostgreSQL connection.')
  }
  if (connection.hostname !== 'postgres' || database !== 'aau_platform') {
    throw new Error('Local DB reset only permits postgres/aau_platform.')
  }

  const maintenanceConnection = new URL(connection)
  maintenanceConnection.pathname = '/postgres'
  const client = new Client({ connectionString: maintenanceConnection.toString() })
  try {
    await client.connect()
    const sessions = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [database],
    )
    if ((sessions.rows[0]?.count ?? 0) > 0) {
      throw new Error('Stop the Payload app and other database clients before resetting the local database.')
    }
    await client.query('DROP DATABASE IF EXISTS "aau_platform" WITH (FORCE)')
    await client.query('CREATE DATABASE "aau_platform"')
    console.log('Recreated local Docker database aau_platform.')
  } finally {
    await client.end().catch(() => undefined)
  }
}

resetLocalDatabase().catch((err) => {
  console.error('Local database reset failed:', err)
  process.exitCode = 1
})
