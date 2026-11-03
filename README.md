# AAU Payload Platform

Arabic-first, bilingual university platform for ALJEEL AL JADEED University. The repository contains the public website, the Payload administration panel, the canonical database seed, and the production Docker workflow.

## Technology

- Node.js 24, pnpm 10, TypeScript
- Next.js 16 App Router with Cache Components and React 19
- Payload CMS 3.86.0; all official `payload` and `@payloadcms/*` packages are version-aligned
- PostgreSQL through `@payloadcms/db-postgres`
- Redis for opaque Preview sessions and application rate limits
- Arabic and English Payload localization; Arabic is the default and is rendered RTL
- Lexical rich text and Tailwind CSS
- Official Payload SEO, redirects, form-builder, and S3 storage plugins
- Optional S3-compatible storage such as Cloudflare R2 or MinIO; local filesystem storage remains available when S3 is disabled

The application uses Payload's Local and REST APIs. GraphQL is intentionally disabled in `payload.config.ts`.

## Content architecture

### Drafts and versions

The following 18 editorial collections use one shared Payload versions policy:

- Pages
- News
- Events
- Blog Posts
- Colleges
- Academic Departments
- Academic Programs
- Faculty Members
- Study Plans
- Campus Life
- Centers
- Projects
- Offers
- Research Publications
- Announcements
- FAQs
- Admission Requirements
- Student Affairs Documents

The policy provides Payload's native `_status`, full version history, a maximum of 50 versions per document, and Autosave with a 400 ms interval. `_status` is shared between Arabic and English; localized status is not enabled.

Each Academic Program has at most one Study Plan. This is enforced by the Study Plan's unique Academic Program relationship and its PostgreSQL migration constraint.

Scheduled publishing is deliberately disabled with `schedulePublish: false`. A dedicated VPS/Docker jobs worker is deferred work and is not started by this repository today.

Five content Globals use audit-only versions, with up to 25 versions per Global and no draft status:

- Site Settings
- About Page
- Contact Settings
- Navbar Settings
- Footer Settings

### Public and draft reads

Public reads and Preview reads are separate execution paths:

- Public loaders query published content only, enforce Payload access with `overrideAccess: false`, and may use Next.js `'use cache'`, cache tags, and cache lifetimes.
- Draft loaders are uncached. They pass the authenticated Payload user, use `draft: true`, and enforce access with `overrideAccess: false`.
- Draft context is propagated through `RenderBlocks` and related-content loaders so a Preview is not a draft page containing cached published sections.
- Public academic content is visible only when its required parent relationships are also published. Programs, departments, faculty members, and study plans share this publication rule rather than duplicating it in individual loaders.

### Preview security and Live Preview

Admin Preview uses a strong opaque token backed by Redis. Trusted claims are kept on the server, not in the browser token. A session is bound to the authenticated user, collection, document, and Payload login session; it has a Redis TTL, is revocable, is stable across Autosaves, and is isolated from Preview sessions for other documents.

Every Preview request:

1. resolves the Redis session and fails closed if it cannot be resolved;
2. reauthenticates the current Payload user;
3. reevaluates the user's active state, role, permission, and college scope;
4. loads the document by ID with `draft: true` and `overrideAccess: false`;
5. resolves the latest canonical route from the fetched draft and redirects away from a stale slug or parent path.

Redis Preview failure does not make the public site depend on Preview availability. Logging never includes Preview tokens, cookies, authorization headers, Payload secrets, passwords, or document contents.

The browser refresh bridge uses Payload's official `RefreshRouteOnSave` component from `@payloadcms/live-preview-react`. The application keeps only the AAU-specific server-rendered refresh and draft-loading glue.

### Routes, redirects, caching, and SEO

`src/utilities/collectionRoutes.ts` is the central route registry for Preview, canonical URLs, sitemap entries, redirects, and revalidation. It includes AAU-specific nested Academic Program and Study Plan routes and explicitly represents collections without public detail pages.

- The official Payload redirects plugin is the only redirects persistence model. Small hooks synchronize old and new canonical paths, including nested routes, and invalidate the public redirect cache.
- The official Payload SEO plugin owns SEO fields for Pages, News, Colleges, Events, Blog Posts, Academic Programs, and Faculty Members. Next.js metadata adapters propagate those fields to the public routes.
- Public cache invalidation distinguishes Autosave drafts from publish, unpublish, delete, slug changes, and parent-route changes. Autosaves do not invalidate public content.
- Sitemap loaders use Next.js cache primitives and the same route registry and cache tags invalidated by collection hooks.

## Access control

The current RBAC model is intentionally hybrid. A complete dynamic-RBAC migration is deferred.

Role levels are:

| Role                | Level | Summary                           |
| ------------------- | ----: | --------------------------------- |
| `super_admin`       |     5 | Highest system administration     |
| `admin`             |     4 | Administrative management         |
| `content_manager`   |     3 | Site-wide content management      |
| `coordinator`       |     2 | College-scoped content management |
| `student`, `doctor` |     1 | Non-editorial accounts            |

Important guarantees:

- Missing or inactive user/role flags fail closed.
- Admin-panel access requires an explicit active role capability.
- Coordinators can create, edit, publish, unpublish, preview, and read versions for content in their `collegeScope`. They cannot read or preview another college's content. Delete access remains Content Manager or above where configured.
- Content Managers can manage site-wide editorial and academic content, content Globals, colleges, and content media. They cannot manage Roles, change role permissions, administer peers or higher-level users, access system secrets, or operate a jobs runner.
- Local API calls made on behalf of a user must pass both the user and `overrideAccess: false`. Trusted migrations, seeds, and controlled test fixtures are the limited server-side exceptions.

## Database schema and migrations

`src/migrations/` contains the official Payload PostgreSQL migrations. Production schema push is disabled and rejected when `PAYLOAD_DB_PUSH=true` under `NODE_ENV=production`.

**Production (VPS)** never runs `pnpm migrate` or `pnpm seed`. The container
applies its own committed migrations and then ensures only the canonical system
Roles and the configured Super Admin:

```text
Fresh DB
-> committed runtime migrations (Payload `prodMigrations`)
-> create missing canonical Roles
-> create/validate the configured Super Admin
-> application healthy (/api/health 200)
```

The broad content Seed is **not** part of production deployment. See
[`deploy/README.md`](deploy/README.md).

**Local development / CI** still uses the explicit sequence, which is where
`pnpm seed` belongs:

```text
PostgreSQL healthy
-> pnpm migrate
-> pnpm seed (explicit, development/CI only)
-> pnpm dev
```

The sequence above is what the **container** does on every start, in either
environment, and it never loads content.

How production gets its content is a separate, one-time act. Production's first
dataset is the accepted staging dataset, restored from a verified platform
backup by `deploy/scripts/initialize-from-backup.sh` **before** the first
release is deployed — never from the Seed, and never by re-running the Neon
migration, which is staging-only and has no production override:

```text
frozen Neon -> corrected migration on STAGING -> accepted staging
  -> final verified staging platform backup  (deploy/scripts/backup.sh)
  -> deploy/scripts/initialize-from-backup.sh -> production
  -> first production release
```

After that one-time initialization, every later production deployment is an
ordinary release onto an existing database: migrations plus the identity
bootstrap, exactly as above. See [`deploy/README.md`](deploy/README.md) §12b and
[`migration/README.md`](migration/README.md).

Useful commands:

```bash
pnpm migrate             # apply pending Payload migrations
pnpm migrate:status      # inspect migration status
pnpm migrate:create      # create a migration after the Payload config is stable
pnpm generate:types      # regenerate src/payload-types.ts
pnpm generate:db-schema  # regenerate src/payload-generated-schema.ts
pnpm generate:importmap  # regenerate the Payload admin import map
pnpm verify:generated    # regenerate and fail if tracked artifacts were stale
```

Schema push exists only for the guarded local Docker development workflow. `pnpm schema:push` requires `APP_ENV=local-docker`, `NODE_ENV=development`, and `PAYLOAD_DB_PUSH=true`.

## Identity bootstrap (no content Seed)

The broad content Seed and the one-time Neon import tooling were removed from this repository. Staging and Production keep their data on the server and are recovered only from verified backups (`deploy/scripts/restore.sh`, `deploy/scripts/initialize-from-backup.sh`); nothing re-seeds or re-imports an environment.

The only automatic data step is the minimal identity bootstrap (`PAYLOAD_RUNTIME_BOOTSTRAP=true`): at start it creates missing canonical Roles and the Super Admin named by `INITIAL_ADMIN_EMAIL` (with `INITIAL_ADMIN_PASSWORD` on first install), and never rewrites content.

## Local development

Requirements:

- Node.js 24
- pnpm 10.34.4
- PostgreSQL
- Redis

Install and run against an already prepared database:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm migrate
pnpm dev
```

The public site is available at `http://localhost:3000` and the admin panel at `http://localhost:3000/admin`.

At minimum, configure:

- `DATABASE_URI` and preferably the direct `DATABASE_DIRECT_URI`
- a random `PAYLOAD_SECRET` of at least 32 characters
- Redis: `REDIS_URL` for a passwordless local instance, or `REDIS_HOST` (plus
  `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`) where a password is set.
  The VPS deployment uses the discrete form: a password containing `/`, `#`,
  `?` or `%` cannot survive being interpolated into a `redis://` URI.
- `NEXT_PUBLIC_SERVER_URL` and `PAYLOAD_SERVER_ORIGIN`
- `INITIAL_ADMIN_EMAIL` and a strong `INITIAL_ADMIN_PASSWORD` for the first Super Admin (identity bootstrap)

See `.env.example` for optional S3/R2, form-rate-limit, and plugin variables. Never commit real secrets.

## Docker development

Docker Compose 2.24 or later is required.

```bash
cp .env.docker.example .env.docker
docker compose up --build --wait
```

The development graph waits for PostgreSQL and Redis, runs the guarded local schema push in `schema-init`, and then starts `app-dev`. Use Compose Watch for source synchronization because the service does not bind-mount the repository:

```bash
docker compose up --watch
```

The local reset operation is an explicit profile:

```bash
docker compose stop app-dev
docker compose --profile manual run --rm --build db-reset
docker compose up --wait
```

The reset command is guarded to the named local Docker database. Never point it at an external database.

## Production deployment (VPS)

The production runtime is **source-free**. The VPS runs a prebuilt image and
needs no Git checkout, no `pnpm install`, no `next build` and no Payload CLI.

Operational documentation lives in **[`deploy/README.md`](deploy/README.md)**;
this section is only the summary.

```
protected release SHA
  → GitHub Actions: exact-SHA gate → build runner image → source-leak checks
  → private GHCR image, identified by digest
  → VPS: deploy/docker-compose.vps.yml (app-prod, postgres-prod, redis-prod)
  → cPanel-managed Apache :443 → 127.0.0.1:3000  (staging: 127.0.0.1:13000)
```

Production and staging run on the same host as two Compose projects
(`aau-production` / `aau-staging`) sharing nothing: separate volumes, uploads,
backups, release state, operation lock, credentials, GHCR package and port.

At container start `app-prod`:

1. applies pending Payload migrations itself (`prodMigrations`, gated on
   `PAYLOAD_RUNTIME_MIGRATIONS`), from the migration list compiled into the
   image;
2. ensures the canonical system Roles exist and the configured Super Admin
   exists (gated on `PAYLOAD_RUNTIME_BOOTSTRAP`);
3. becomes ready — `/api/health` cannot return 200 until both succeed.

Roles that already exist are never reconciled, and an existing Super Admin is
validated but never rewritten and never has its password reset.

Preparation and deployment are **separate workflows**, because a digest cannot
be authorized before it exists. `release-production.yml` checks the commit is
contained in `PRODUCTION_RELEASE_REF` — which is **`main`** — passes the release
gate and the `production` Environment, then builds and publishes **once**.
`deploy-production.yml` then pulls that exact digest, re-derives the commit from
the artifact's own `org.opencontainers.image.revision` label and re-checks *that*
against the lineage, and cuts over after a second approval. So the artifact
gated and approved is byte-for-byte the one deployed, and the image is never
rebuilt in between.

A production release is therefore always an **immutable digest** in the
production package, never a tag.

```bash
# Normal deploy, on the VPS
/srv/aau/production/deploy/scripts/deploy.sh \
  ghcr.io/aau-university/aau-platform@sha256:<digest>
```

The deploy script takes the shared operation lock (deploy, restore, backup and
seed are mutually exclusive), resolves the reference to an immutable digest,
creates and verifies a backup, and then opens a **maintenance window**: the
previous release is stopped, the new one is started as a **candidate on a
private port** no proxy forwards to, and only a candidate that passes its health
gate is promoted onto the stable port.

The window is deliberate. Leaving the old release up while the candidate
migrates would make the outage look shorter, and would mean old code — and old
writes — running against a schema it was not built for. A recoverable failure
(schema unchanged) restarts the previous release automatically; an
unrecoverable one leaves the service down with a restore instruction, because a
visible outage is better than a site that looks up while corrupting rows.

Release identity lives in `<deploy-root>/deployed-image`, never in the env file
and never as a compose default — so a bare `docker compose up` cannot resurrect
a stale release. Use `deploy/scripts/compose.sh`.

> **The broad canonical Seed never runs at startup, in either environment.**
> `PAYLOAD_SEED_ENABLED=false`, and no start, deploy, restart or host reboot
> invokes it. There is deliberately no `FULL_SEED` toggle: it would re-run the
> broad Seed after every reboot and OOM kill. It is an explicit one-shot
> operation (`deploy/scripts/seed.sh`) run from a source-free bundled artifact,
> and it is a **staging** capability.
>
> **Both** Seed modes are refused in production — the destructive
> `reset-and-full` and the broad `full` alike. The refusal lives in `runSeed`
> itself, the one function every entry point must call, so it holds for the
> deploy scripts, the one-shot runner and the authenticated route equally. It
> keys on `AAU_ENV`, and an unset value reads as production. Production content
> arrives through `initialize-from-backup.sh`, from a verified platform
> backup.

> Docker image rollback is **not** database rollback. Once migrations have
> applied, recovery from an incompatible change means restoring the verified
> backup — see `deploy/README.md`.

### CI-only source-build stack

`docker-compose.prod.yml` remains as a **CI regression contract** — it builds
from source and exercises the `operations` image, `migrate-prod` and the
explicit `canonical-seed-source-build` profile. It is not the VPS runtime, and
the source-containing `operations` image must never be published or deployed.

That service used to be called `seed-bootstrap-prod`, which read as the minimal
identity bootstrap while actually running the broad canonical Seed. Those are
different operations with very different blast radii, so it is now named for
what it does.

## Commands and verification

```bash
pnpm dev                     # Next.js development server
pnpm build                   # production Next.js build
pnpm build:standalone        # standalone build used by Playwright
pnpm start                   # serve a normal production build
pnpm start:standalone        # serve .next/standalone/server.js
pnpm lint                    # repository ESLint
pnpm typecheck               # Next route generation + TypeScript
pnpm check:payload-versions  # verify the Payload package family is aligned
pnpm test:unit               # Vitest unit/component tests
pnpm test:int                # Testcontainers PostgreSQL + Redis integration tests
pnpm test:seed               # fresh migrated Testcontainers DB + seed/idempotency tests
pnpm test:e2e                # production standalone build + Playwright Chromium
pnpm test                    # unit, integration, then E2E
```

Database integration suites do not silently skip missing infrastructure. Testcontainers starts disposable PostgreSQL and Redis instances, applies official migrations, runs the suite, and removes the containers. Playwright uses one worker because its fixtures share one scratch database and server cache.

The PR release gate runs:

- frozen dependency installation and Payload version alignment;
- ESLint, TypeScript, and unit tests;
- Testcontainers integration and seed/idempotency tests;
- generated-file and migration-drift checks;
- a production Next.js build;
- Playwright against the standalone production server, including real Admin Live Preview;
- development and production Docker builds;
- fresh PostgreSQL migration, first seed, second-seed idempotency, app health/public smoke tests, and normal-redeploy state preservation.

No required test suite is intentionally skipped when infrastructure is unavailable.

## Repository layout

```text
src/
|-- access/          # RBAC and college-scope policies
|-- app/(frontend)/  # public routes, Preview, sitemap, and seed adapters
|-- app/(payload)/   # Payload admin and REST surface
|-- blocks/          # page-builder blocks and RenderBlocks
|-- collections/     # Payload collections
|-- components/      # public and admin UI
|-- globals/         # Payload Globals
|-- hooks/           # publication, revalidation, redirects, and audit hooks
|-- lib/payload/     # public/draft loaders, cache helpers, Preview sessions
|-- migrations/      # official Payload PostgreSQL migrations
|-- plugins/         # official plugin configuration
|-- seed/            # canonical idempotent seed
|-- utilities/       # route registry, metadata, and version policies
`-- payload.config.ts

tests/
|-- e2e/             # Playwright browser tests
|-- int/             # PostgreSQL/Redis integration tests
|-- seed/            # fresh-database and seed lifecycle tests
`-- helpers/         # test fixtures and Testcontainers setup
```

## Deferred work

- A dedicated Payload jobs worker for scheduled publishing on VPS/Docker
- Migration from the current hybrid RBAC model to fully dynamic RBAC

These items are intentionally outside the current runtime architecture; no Vercel Cron, approval workflow, alternate authorization framework, or second redirects/SEO system is present.
