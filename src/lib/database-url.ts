/**
 * Builds the PostgreSQL connection URI the Payload adapter connects with.
 *
 * ── Why the application assembles the URI instead of reading one ──────────
 * The deployment env file used to carry the application password THREE times:
 * once as `APP_DB_PASSWORD` (which provisions the role) and twice more embedded
 * in `DATABASE_URI` and `DATABASE_DIRECT_URI`. Nothing kept those copies equal,
 * and they are not even written in the same encoding — a URI needs
 * percent-encoding for characters that a plain env value does not. A strong
 * random password containing `@`, `:`, `/`, `?`, `#` or `%` is therefore
 * *correct* in `APP_DB_PASSWORD` and *broken* inside the URIs unless the
 * operator hand-encodes it identically in both places.
 *
 * That is a silent-data-loss shaped failure: the role is created with one
 * password and the application connects with another, or `@` in a password
 * makes the parser read a different HOST entirely. So the password now exists
 * in exactly one variable and this module does the encoding, mechanically and
 * identically, every time.
 *
 * ── Compatibility ────────────────────────────────────────────────────────
 * `DATABASE_URI` / `DATABASE_DIRECT_URI` remain supported and take precedence.
 * Local development, the CI release gate and the source-build regression stack
 * all pass a ready-made URI, and there is no reason to churn them.
 */

/** Names of the discrete variables, so tests and docs can't drift from code. */
export const DISCRETE_DATABASE_VARS = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
] as const

export interface DiscreteDatabaseConfig {
  host: string
  port?: string
  name: string
  user: string
  password: string
}

/**
 * Percent-encode one userinfo component of a URI.
 *
 * `encodeURIComponent` leaves exactly the unreserved characters and the
 * sub-delims `!'()*` unescaped, all of which are legal in a URI userinfo
 * component, and escapes everything that would change the URI's structure —
 * `@`, `:`, `/`, `?`, `#`, `&`, `=`, `+`, `%` and space. That is precisely the
 * set that must not survive verbatim.
 */
function encodeUserInfo(value: string): string {
  return encodeURIComponent(value)
}

/**
 * A hostname, an IPv4 address, or a bracketed IPv6 address — nothing else.
 *
 * The host is the one component that is NOT percent-encoded below, because
 * encoding it would break legitimate values. That makes it structural: a value
 * like `db@evil` produces `postgresql://user:pass@db@evil:5432/name`, and a URI
 * parser takes the LAST `@` as the delimiter — so the connection silently goes
 * to `evil` instead. `/`, `?` and `#` end the authority the same way. Rejecting
 * those shapes is cheaper than explaining the outage.
 */
function assertUriHost(host: string): void {
  const bracketed = /^\[[0-9A-Fa-f:.]+\]$/.test(host)
  const hostname = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/.test(
    host,
  )
  if (!bracketed && !hostname) {
    throw new Error(
      `DATABASE_HOST must be a hostname, an IPv4 address, or a bracketed IPv6 address; ` +
        `received ${JSON.stringify(host)}. A value carrying '@', '/', '?' or '#' would ` +
        `change which server the connection URI actually addresses.`,
    )
  }
}

/**
 * Assemble `postgresql://user:password@host:port/database` with every
 * user-supplied component encoded.
 */
export function buildPostgresUri(config: DiscreteDatabaseConfig): string {
  const port = config.port?.trim() || '5432'

  if (!/^\d+$/.test(port)) {
    throw new Error(`DATABASE_PORT must be numeric; received ${JSON.stringify(port)}`)
  }
  if (!config.host.trim()) throw new Error('DATABASE_HOST must not be empty')
  assertUriHost(config.host.trim())
  if (!config.name.trim()) throw new Error('DATABASE_NAME must not be empty')
  if (!config.user.trim()) throw new Error('DATABASE_USER must not be empty')

  const user = encodeUserInfo(config.user)
  const password = encodeUserInfo(config.password)
  // The database name is a path segment, not userinfo: `/` must be escaped so a
  // name cannot introduce another segment.
  const database = encodeURIComponent(config.name)

  return `postgresql://${user}:${password}@${config.host.trim()}:${port}/${database}`
}

/**
 * Resolve the connection string for Payload.
 *
 * Precedence, highest first:
 *   1. `DATABASE_DIRECT_URI` — migrations and Payload transactions need a
 *      direct (non-pooled) connection, so it wins when set.
 *   2. `DATABASE_URI`
 *   3. the discrete `DATABASE_*` variables, assembled here.
 *
 * Returns an empty string when nothing is configured, matching the previous
 * behaviour: `next build` evaluates this config without database credentials
 * and must not throw for lack of them.
 */
export function resolveDatabaseConnectionString(
  // A plain string map rather than `NodeJS.ProcessEnv`: the parameter exists so
  // tests can pass a fixture, and `ProcessEnv` carries index-signature details
  // that make an object literal an invalid cast.
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const direct = env.DATABASE_DIRECT_URI?.trim()
  if (direct) return direct

  const uri = env.DATABASE_URI?.trim()
  if (uri) return uri

  const host = env.DATABASE_HOST?.trim()
  const name = env.DATABASE_NAME?.trim()
  const user = env.DATABASE_USER?.trim()
  const password = env.DATABASE_PASSWORD

  // Any ONE of the discrete variables means the operator intended to use them,
  // so a partial set must be REPORTED rather than silently read as "nothing is
  // configured". Checking only host/name/user missed a lone DATABASE_PASSWORD
  // or DATABASE_PORT, which returned '' and failed much later with a confusing
  // error about an empty connection string.
  const hasDiscreteConfiguration = DISCRETE_DATABASE_VARS.some((key) => env[key] !== undefined)
  if (!hasDiscreteConfiguration) return ''

  // A partially-configured discrete set is a misconfiguration, not a reason to
  // fall back to an empty connection string that fails later with a confusing
  // error. Name the missing variables.
  const missing = DISCRETE_DATABASE_VARS.filter((key) => {
    if (key === 'DATABASE_PORT') return false
    if (key === 'DATABASE_PASSWORD') return typeof env[key] !== 'string' || env[key] === ''
    return !env[key]?.trim()
  })
  if (missing.length > 0) {
    throw new Error(
      `Incomplete database configuration: ${missing.join(', ')} must be set when using the discrete DATABASE_* variables. ` +
        'Set all of them, or supply DATABASE_URI instead.',
    )
  }

  return buildPostgresUri({
    host: host as string,
    port: env.DATABASE_PORT,
    name: name as string,
    user: user as string,
    password: password as string,
  })
}
