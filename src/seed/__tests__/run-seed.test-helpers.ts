export const directPoolOptions = {
  connectionString: 'postgresql://seed.example.test/aau',
}

interface SeedTestEnvironment {
  databaseUri: string | undefined
  directUri: string | undefined
}

export function setupSeedTestEnvironment(): SeedTestEnvironment {
  const environment = {
    databaseUri: process.env.DATABASE_URI,
    directUri: process.env.DATABASE_DIRECT_URI,
  }
  process.env.DATABASE_DIRECT_URI = directPoolOptions.connectionString
  return environment
}

export function restoreSeedTestEnvironment(environment: SeedTestEnvironment): void {
  if (environment.databaseUri === undefined) {
    delete process.env.DATABASE_URI
  } else {
    process.env.DATABASE_URI = environment.databaseUri
  }
  if (environment.directUri === undefined) {
    delete process.env.DATABASE_DIRECT_URI
  } else {
    process.env.DATABASE_DIRECT_URI = environment.directUri
  }
}
