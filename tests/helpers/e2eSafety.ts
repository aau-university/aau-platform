type Environment = Record<string, string | undefined>

export interface ValidatedE2EEnvironment {
  webServerEnv: Record<string, string>
}

const LOCAL_DATABASE_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost', 'postgres'])

export function assertLocalDatabaseURL(value: string, label: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} is not a valid database URL.`)
  }

  if (!LOCAL_DATABASE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `Refusing destructive test access because ${label} does not target local PostgreSQL.`,
    )
  }

  return url
}

export function validateE2EEnvironment(environment: Environment): ValidatedE2EEnvironment {
  if (environment.PAYLOAD_DB_PUSH?.trim() === 'true') {
    throw new Error('Refusing E2E startup while PAYLOAD_DB_PUSH=true.')
  }

  const databaseVariables = ['DATABASE_DIRECT_URI', 'DATABASE_URI'] as const
  const configured = databaseVariables.flatMap((name) => {
    const value = environment[name]?.trim()
    return value ? [{ name, value }] : []
  })

  if (configured.length === 0) {
    throw new Error('E2E requires DATABASE_URI or DATABASE_DIRECT_URI.')
  }

  const webServerEnv: Record<string, string> = {
    PAYLOAD_DB_PUSH: 'false',
    // The browser suite runs the real standalone production artifact, which
    // means NODE_ENV=production over a loopback HTTP origin. The production
    // runtime otherwise fails closed on a non-HTTPS origin (see
    // `src/utilities/getURL.ts`), so the test harness opts out explicitly.
    // This is the only place that flag is set; the VPS profile never sets it,
    // and `deploy/__tests__` asserts as much.
    PAYLOAD_ALLOW_INSECURE_ORIGIN: 'true',
    // Startup must not mutate the E2E database: the browser suite manages its
    // own fixtures, and migrations are applied by `pnpm migrate` beforehand.
    PAYLOAD_RUNTIME_MIGRATIONS: 'false',
    PAYLOAD_RUNTIME_BOOTSTRAP: 'false',
  }
  for (const { name, value } of configured) {
    const databaseURL = assertLocalDatabaseURL(value, name)
    const databaseName = decodeURIComponent(databaseURL.pathname.replace(/^\/+/, ''))

    if (!databaseName.startsWith('aau_fixes_')) {
      throw new Error(`Refusing E2E startup because ${name} is not an aau_fixes_* database.`)
    }
    webServerEnv[name] = value
  }

  return { webServerEnv }
}
