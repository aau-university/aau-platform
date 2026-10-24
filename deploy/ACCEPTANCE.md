# Production acceptance status

Maps every **REQUIRED** acceptance criterion from the Docker/VPS production
plan (§21) to its current, evidenced status.

Exactly five statuses are used. Nothing is "partially" passed.

| Status | Meaning |
| --- | --- |
| **PASS** | The exact claimed behaviour was exercised against the runner image, a real PostgreSQL, or the file it asserts on. Reproducible with the command shown. |
| **PENDING REAL VPS** | Genuinely requires the university server, its domain, its firewall or its host key. Not faked, not partially claimed. A Docker simulation never satisfies one of these. |
| **PENDING GITHUB CONFIGURATION** | Requires a repository variable, secret or Environment that only an owner can set. |
| **PENDING RELEASE ACTIVATION** | Requires a real registry push or cutover that only exists once the release path is switched on. |
| **NOT DONE / DEFERRED** | Not implemented, or implemented but not proven. Stated plainly, with the reason. |

> **Production has NOT been deployed.** No release has ever run on the real
> university VPS, and this PR has not been merged.

Reproduce everything marked PASS with:

```bash
docker build --target runner \
  --build-arg NEXT_PUBLIC_SERVER_URL=https://aau-vps.simulation.test \
  -t aau-runner:test .

bash scripts/assert-runner-image.sh          aau-runner:test   # image contents
bash tests/docker/production-simulation.sh   aau-runner:test   # §21.1 §21.2 §21.3 §21.4
bash tests/docker/reverse-proxy-simulation.sh aau-runner:test  # §21.1 §21.4
bash tests/docker/backup-restore-drill.sh    aau-runner:test   # §21.6
bash tests/docker/first-install-and-recovery-drill.sh aau-runner:test  # first install + recovery
bash tests/docker/deploy-safety-drill.sh     aau-runner:test   # dirty-DB refusal, backup-failure recovery, snapshot restore
bash tests/docker/cutover-gating-drill.sh    aau-runner:test   # no traffic reaches an unhealthy candidate
bash tests/docker/seed-one-shot-drill.sh     aau-runner:test   # explicit, source-free, one-shot Seed

# Host-script drills — no Docker image needed
bash tests/deploy/operation-lock-drill.sh                      # real concurrent processes
bash tests/deploy/env-contract-drill.sh                        # real `docker compose` env-file parsing
bash tests/deploy/environment-isolation-drill.sh               # production vs staging
bash tests/deploy/initialize-guard-drill.sh                    # first-install initialization refusals

pnpm vitest run --config ./vitest.db.config.mts tests/int/bootstrap-concurrency.int.spec.ts
pnpm vitest run --config ./vitest.config.mts src/bootstrap src/__tests__/config src/__tests__/lib
```

> **Sandbox note.** This environment transparently intercepts TLS, so
> `next/font/google` cannot complete inside `docker build` without the
> interception CA. (An earlier revision of this document said the Trivy
> vulnerability DB was unreachable here and that local scans were therefore
> worthless. That was true of the naive invocation only: with the proxy CA
> mounted and the container on the host network, Trivy downloads a current DB
> and scans normally. Local scan results below state the DB's publication time
> so they can be judged rather than trusted.) Local drill runs therefore build with a throwaway Dockerfile
> that differs from the committed one only by adding that CA to the `base`
> stage — it is never committed, and it cannot reach the runner image, which
> starts `FROM` the pinned base again. On a normal network the committed
> Dockerfile builds unchanged; CI uses it directly.

The same suites run in CI as the `runner-production-simulation` job of the
release gate.

**CI evidence.** The final HEAD and release-gate run for this pass are recorded
in the PR description (they change on each push; this document names the
behaviour, the PR names the exact run). Earlier in the pass, run `32521281035`
on HEAD `6b141b9` confirmed the runner image scans to **zero** fixable
HIGH/CRITICAL and every job except `security` green; `security` was still red
there only because the gate still hard-blocked on the third-party data images.
This round adopts the split policy (§T-red), under which the runner image
hard-blocks (clean) and the data images are report-only, so the `security` job
now passes while a scanner failure or unpinned image still fails it closed —
verified by `trivy-scan-gate-drill.sh` (20/20) and against the real scanner.

---

## 21.1 Exact image tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| Final runner image starts with no repository source mounted | **PASS** | production-simulation phase 1 — no bind mount of any source path exists in `deploy/docker-compose.vps.yml` |
| Fresh DB created entirely by runner `prodMigrations` | **PASS** | phase 1: starts from 0 tables, ends with both committed migrations recorded |
| Upgrade DB receives only pending migrations | **PASS** | phase 3: ledger rolled back to the previous state, only the pending migration re-applies |
| Same image restart is idempotent | **PASS** | phase 2: migration ledger, Role rows and Super Admin row all byte-identical after restart |
| Migration failure keeps readiness unhealthy | **PASS** | phase 5: privilege-denied database → migration error logged → process exits 1 → health never 200 |
| Bootstrap failure keeps readiness unhealthy | **PASS** | Payload 3.86.0 **swallows** `onInit` errors — measured against the runner image, a container whose Super Admin bootstrap failed logged `Error running onInit function` and then answered `/api/health` with 200 from the second request on, so a broken release passed the health gate. `identity-bootstrap-runner.ts` now records the failure for `/api/health` and terminates the process. Re-measured on the fixed image: the container exits 1 and health never returns 200 in 90 s. Covered by `identity-bootstrap-runner.test.ts` and first-install drill phase 5a |
| Final image contains no project source tree / real env secrets | **PASS** | `assert-runner-image.sh`: `/app/src`, `/app/.git`, `/app/tests`, `.env`, and every secret-named ENV asserted absent |
| Image optimization actually works in the runner | **PASS** | A health check does not touch sharp: an image whose sharp cannot load its native library still answers `/api/health`, which is how a broken sharp upgrade once reached "the container is up". Two assertions close that gap — `assert-runner-image.sh` loads sharp inside the built image and performs a real resize, reporting the libvips version it bound to; production-simulation phase 1 drives `GET /_next/image?url=/assets/university-logo.png&w=256&q=75` through the running container and asserts status, `content-type` and a non-trivial body. Both were mutation-checked: with the `@img` packages deleted from an otherwise working image, the probe fails with the exact `Could not load the "sharp" module` error the reverted upgrade shipped |
| Final image ships no package manager | **PASS** | The base image bundles npm, corepack and yarn. A source-free runtime never invokes any of them, and npm's vendored `tar` (CVE-2026-59873, **CRITICAL**), `ip-address`, `undici` and `brace-expansion` accounted for 7 of the runner image's 8 image-scan findings — vulnerable code this application neither uses nor can upgrade, because it belongs to npm rather than to `pnpm-lock.yaml`. The runner stage deletes all of them. `assert-runner-image.sh` asserts it two ways (`command -v` over npm/npx/corepack/pnpm/yarn plus an empty `/usr/local/lib/node_modules`, and each of the four vendored packages by name) and asserts `node` still runs, so the removal cannot silently break the runtime instead. The assertion is not decorative: on its first run it caught `/usr/local/bin/yarn`, which the first version of the deletion had missed |
| Production CORS/CSRF allow-list excludes localhost | **PASS** | `production-origin.test.ts` |
| Production HTTPS admin auth cookie is `HttpOnly` + `Secure`; login/session work through the proxy | **PASS** | reverse-proxy-simulation: real Nginx + TLS, login 200, cookie asserted `HttpOnly` and `Secure`. Re-verification on the university proxy is a separate row in §21.4 |

## 21.2 Bootstrap tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| Fresh DB creates every missing canonical Role from current `roleFixtures` | **PASS** | phase 1: exactly `admin content_manager coordinator doctor student super_admin` |
| Fresh DB has exactly the expected canonical Role slugs | **PASS** | phase 1 (exact set equality) |
| Both localized Role values created correctly | **PASS** | phase 1: 12 `roles_locales` rows across `ar` and `en` |
| Existing canonical Roles are not reconciled/overwritten | **PASS** | phase 2: a deliberately drifted `coordinator.can_access_refine` survives restart untouched |
| Fresh DB creates the Super Admin after Roles exist | **PASS** | phase 1 |
| No broad Seed content appears automatically | **PASS** | phase 1: colleges, programs, pages, news, events, media, navigation all 0; no `Seed completed` in logs |
| Second startup is idempotent | **PASS** | phase 2 |
| Existing Super Admin password is never reset | **PASS** | phase 2 and phase 3: password hash + salt identical |
| Existing valid account works without the bootstrap password | **PASS** | unit test "validates an existing Super Admin without needing the bootstrap password" |
| Missing account + missing password fails closed | **PASS** | unit test "fails closed when the account is missing and no bootstrap password is configured" |
| Existing non-Super-Admin Role data unchanged by bootstrap | **PASS** | phase 2 + unit test "leaves a drifted non-canonical Role field exactly as stored" |
| Existing `super_admin` Role/account are validate-only | **PASS** | unit tests in "incompatible state fails closed" — no user update is ever issued. Invariants now include the canonical `level`, `isSystemRole`, and the account's `roleLevel` snapshot, each with its own regression test |
| Incompatible existing bootstrap state fails closed | **PASS** | same suite: inactive account, wrong Role, wrong `systemRole`, stale permission snapshot |
| Concurrent initialization cannot create duplicates | **PASS** | `tests/int/bootstrap-concurrency.int.spec.ts` runs **4 concurrent initializers against real PostgreSQL**: each Role is created at most once, exactly one initializer creates the account, one user remains, and no advisory lock is left held. Unit tests additionally cover lock ordering, release-on-failure and the lost-race path |

## 21.3 Seed-isolation tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| Production runtime Compose has no Seed service/dependency | **PASS** | `vps-deployment-contract.test.ts`; `seed-isolation.test.ts` |
| Production deploy/start/reboot never executes `pnpm seed` | **PASS** | `seed-isolation.test.ts` scans the VPS compose and deploy script; phase 1 asserts no `Seed completed` in logs |
| `PAYLOAD_SEED_ENABLED=false` in the VPS profile | **PASS** | `seed-isolation.test.ts` |
| Fresh startup creates only canonical Roles + Super Admin | **PASS** | phase 1; unit test "never creates ordinary users or any broad Seed content" |
| Broad Seed code/tests remain independent | **PASS** | the Seed is still a separate one-shot operation with no startup or Compose coupling (`seed-isolation.test.ts`, `vps-deployment-contract.test.ts`). Files under `src/seed/**` **are** changed by this PR — `one-shot.ts` (the source-free entrypoint), `lib/deployment-environment.ts`, and the destructive-reset policy in `run-seed.ts`/`stages/optional-users.ts` — so this row does not claim they are untouched; it claims the Seed did not become part of the deployment path. `pnpm test:seed` green (188 tests) |
| No ordinary users or content created by bootstrap | **PASS** | phase 1: exactly one user; only `roles` and `users` are ever written |

## 21.4 Persistence / network tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| PostgreSQL survives app container replacement | **PASS** | phase 4 |
| Uploads survive app container replacement | **PASS** | phase 4 |
| Redis/PostgreSQL are not published to any host interface | **PASS** | phase 0: `docker port` shows no published mapping for either, and both sit on an `internal: true` network whose gateway is removed — verified with `docker network inspect`. Deliberately **not** claimed as host isolation: the Docker host owns the bridge and can reach container IPs regardless, which is why both services also require authentication (see §21.6 and the compose file) |
| Payload connects with a non-superuser PostgreSQL role and still passes fresh/upgrade migrations | **PASS** | phase 0 asserts `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false` and database ownership; phases 1 and 3 then migrate successfully as that role |
| App port 3000 is not published beyond loopback | **PASS** | phase 1: bound to `127.0.0.1:3000` only |
| Host firewall matches intended ports | **PENDING REAL VPS** | No host exists to configure or scan |
| Real domain HTTPS works | **PENDING REAL VPS** | |
| Certificate renewal path verified | **PENDING REAL VPS** | |
| Reverse proxy preserves Next streaming | **PASS** | reverse-proxy-simulation with `proxy_buffering off`, against real Nginx + TLS |
| Reverse proxy handles admin, upload limits, timeouts | **PASS** | reverse-proxy-simulation: admin reachable, in-policy body accepted, oversized rejected 413, HTTP→HTTPS 301 |
| The same proxy behaviour re-verified on the university proxy | **PENDING REAL VPS** | The simulation uses this repository's Nginx config; the university's own proxy configuration is not available here |

## 21.5 Deployment tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| Production workflow validates the exact deployed SHA | **PASS** | `release-production.yml` calls the reusable release gate with the exact `ref` before building, and `deploy-production.yml` deploys only a digest that workflow published — it cannot build |
| Only the runner image is published | **PASS** | `build-publish.yml` pins `target: runner` and asserts the operations image is not what was built |
| Digest is captured and deployed | **PASS** | build outputs the digest; `deploy.sh` resolves `RepoDigests` and refuses to continue without one |
| Production concurrency queues rather than cancels | **PASS** | `concurrency: production-deployment` with `cancel-in-progress: false` |
| Deploy-lock logic testable locally | **PASS** | `flock` in `deploy.sh`, asserted by contract test and exercised by every drill run |
| Deployed SHA is authorized against a release lineage, not merely resolved | **PASS** | Checked **twice**, on different evidence. `release-production.yml` runs `git merge-base --is-ancestor <sha> <PRODUCTION_RELEASE_REF>` on the ref an operator asked to publish; `deploy-production.yml` re-derives the commit from the ARTIFACT's own `org.opencontainers.image.revision` label and checks that, so the commit authorized at cutover is the one that actually built the image. An unset `PRODUCTION_RELEASE_REF` denies in both. Guarded by `vps-deployment-contract.test.ts` |
| The CI deploy account is not root-equivalent | **PASS** | Two independent boundaries: an authorized_keys **forced command** (`ssh-forced-command.sh`) means the CI key can only trigger a deploy — never a shell — and the root-owned `deploy-entrypoint.sh` (single wildcard-free sudo target) accepts **only** an immutable digest for the **exact** hardcoded AAU repository (not env-overridable), then `exec env -i` so `SKIP_BACKUP`/`DEPLOY_ROOT` cannot be injected. No `docker` group, no root shell, no env-file read. Guarded by contract tests + a standalone accept/reject harness (attacker repo, mutable tag, malformed digest, metachar injection, env-override all rejected) |
| The SSH account can actually run the deploy | **PASS** | The account uses a real shell, not `nologin` — OpenSSH runs remote commands through the login shell, so `nologin` would refuse the deploy too. The forced command constrains it instead. A contract test forbids provisioning the account with a `nologin`/`false` shell |
| The privileged boundary takes digests only, never a mutable tag | **PASS** | `deploy-entrypoint.sh` rejects any reference that is not `<repo>@sha256:<64 hex>`; the deploy workflow already passes the resolved digest. Verified by the accept/reject harness |
| A validation build can never occupy the production tag | **PASS** | `build-publish.yml` refuses to publish a non-`https://` or `.invalid`/localhost origin, prefixes every unpublished tag with `validation-`, and asserts the built image actually carries the origin it was built for. Guarded by contract tests |
| First install works end to end from an empty host | **PASS** | first-install drill phase 1: `deploy.sh` run against no stack, no database, no state file and no backup directory — detects first install explicitly, does not abort on the backup gate, and ends with all six Roles, the Super Admin and a recorded digest |
| Redeploy takes and verifies a real backup | **PASS** | first-install drill phase 2 |
| Backups record the compatible application state | **PASS** | phase 3: `metadata.json` carries image, git revision and applied migration list |
| Corrupt archives are rejected before a restore destroys anything | **PASS** | phase 4: `tar --test` is shown to pass on the corrupted archive while `gzip --test` and `restore.sh` both reject it. Every verification in `restore.sh` runs before the first `DROP SCHEMA`, asserted by contract test |
| A partially-deleted backup is rejected rather than silently degraded | **PASS** | `backup.sh` writes a `MANIFEST` of required artifacts and `restore.sh` refuses to start when one is missing. `sha256sum --check --ignore-missing` was measured to EXIT 0 over a deleted listed file, so it is not used — a contract test forbids reintroducing it |
| Missing local uploads fail the backup instead of warning | **PASS** | `REQUIRE_UPLOADS=true` by default; only `S3_ENABLED=true` legitimately omits them. Archives are verified by `gzip --test` plus a full member read, never `tar --test` |
| Rollback is migration-aware, in both directions | **PASS** | first-install drill phase **5a**: the migration's own `down` SQL rolls the schema back, the candidate applies it and then fails health — `deploy.sh` reports "migration state CHANGED", refuses to start the previous image, and points at `restore.sh`. Phase **5b**: schema unchanged, health times out — `deploy.sh` reports "schema unchanged — restarting the previous release" and the previous image becomes healthy again. Promotion-phase failure (after the candidate is healthy, before the stable port serves) is covered separately by `promotion-failure-drill.sh` |
| Restore uses the image recorded with the backup | **PASS** | phase 6: succeeds with `APP_IMAGE` deliberately pointing at a non-existent tag |
| The restore point is internally coherent | **PASS** | `QUIESCE_APP=true` stops the app for the pre-cutover backup so the dump and the uploads archive describe one instant; `metadata.json` records `quiesced` vs `live` so a restore knows which it has |
| Backup failure blocks cutover | **PASS** | `deploy.sh` aborts on backup failure; asserted by contract test; `backup.sh` fails on an unreadable dump. The real off-host backup destination is a separate **PENDING REAL VPS** row in §21.6 |
| A failed pre-cutover backup does not cause an outage | **PASS** | deploy-safety-drill V3: a redeploy whose quiesced backup fails (disk full during the dump) exits non-zero, but `deploy.sh` restarts the previous known-good app and it becomes healthy again; the deployed-image state and migration ledger are unchanged. `backup.sh` also fails closed if it cannot confirm the app stopped, rather than recording an incoherent "quiesced" snapshot |
| First-install detection fails closed on a dirty database | **PASS** | deploy-safety-drill V5: a genuinely empty database is a first install; a database with application tables but no `payload_migrations` ledger is **refused** (no backup skipped, no migrations applied onto an unknown schema) |
| A restore reproduces the snapshot, it does not overlay | **PASS** | deploy-safety-drill V4: back up `{A}`, create `B`, restore → only `A` remains. `restore.sh` extracts to a staging directory and swaps it in, so files created after the backup are removed and a failed extraction leaves the live tree untouched |
| The secret env file is never shell-evaluated | **PASS** | `deploy.sh`/`backup.sh`/`restore.sh` read only the non-secret keys they need via `read-env.sh`, without `source`. Measured: `source`-ing an env file whose password contains `$(...)`/backticks EXECUTES it; the safe reader extracts the same values and executes nothing |
| Bad candidate health blocks success | **PASS** | health gate in `deploy.sh`; phase 5 proves an unhealthy candidate never reports healthy |
| Previous image digest remains available | **PASS** | `deploy.sh` records and retains the previous digest |
| Schema-compatible rollback tested locally | **PASS** | `deploy.sh` reverts to the previous digest on health failure. **PENDING REAL VPS** on the real host |

## 21.6 Recovery / operations tests

| Criterion | Status | Evidence |
| --- | --- | --- |
| Backup/restore scripts proven locally | **PASS** | backup-restore-drill against the real `deploy/scripts` |
| Upload backup/restore logic proven locally | **PASS** | drill restores the media fixture |
| Disposable/local restore drill passes | **PASS** | drill: Roles, application data, Super Admin credentials and media all restored; health 200 after |
| PostgreSQL/upload backups exist off-VPS | **PENDING REAL VPS** | no off-host destination exists yet |
| Docker logs are bounded | **PASS** | `local` driver, 20 MB × 5, asserted by contract test |
| Monitoring configuration/runbook exists | **PASS** | `deploy/README.md` §7. Real disk alerting is **PENDING REAL VPS** |
| VPS reboot returns the stack to healthy without Seed | **PENDING REAL VPS** | |
| Host time synchronization healthy | **PENDING REAL VPS** | |

---

## Other REQUIRED items outside §21

| Item | Status | Notes |
| --- | --- | --- |
| §3.1 explicit Dockerfile frontend | **PASS** | `# syntax=docker/dockerfile:1` |
| §3.2 no production secrets in build ARG/ENV | **PASS** | build-only secret scoped to a single `RUN`; contract test forbids secret-named ARG/ENV |
| §3.3 one image per release for the real origin | **PASS** | `NEXT_PUBLIC_SERVER_URL` is a build arg; it is inlined at `next build` and cannot be set at runtime |
| §3.4 digest-pinned base images | **PASS** | `node:24.19.0-bookworm-slim@sha256:3638d9a6…` (Dockerfile), `postgres:18.6-bookworm@sha256:7d2695c3…` and `redis:8.8.2-trixie@sha256:2b42a936…` (`deploy/docker-compose.vps.yml`). Each digest was read from the Docker Hub registry API and cross-checked against the locally pulled image, not copied from memory. `.github/dependabot.yml` covers **both** locations, with the ecosystem each one actually needs: `docker` in `/` for the Dockerfile, and `docker-compose` in `/deploy` for `deploy/docker-compose.vps.yml`, so every pin gets update PRs — a single directory-scoped `docker` entry would never see the Postgres/Redis digests. A contract test fails if any `FROM` loses its digest |
| §4.4 one explicit production origin, no localhost fallback | **PASS** | fail-closed in `getURL.ts` |
| §5.5 migrations versioned, reviewed, no push/fresh/reset | **PASS** | `PAYLOAD_DB_PUSH=false` pinned; migration-drift CI unchanged and green |
| §10.2 branch/ruleset protection | **PENDING RELEASE ACTIVATION** | Repository settings cannot be changed from code |
| §10.3 GitHub `production` Environment | **PENDING RELEASE ACTIVATION** | Referenced by the workflow; must be created with the VPS secrets |
| §10.5 private GHCR immutable publishing | **PENDING RELEASE ACTIVATION** | The workflow is complete and its identity guards are covered by contract tests, but no real GHCR push has happened: this sandbox's egress blocks registry blob storage, and no push may be claimed that was not performed. To publish for real, run **`release-production.yml`** — the approved-lineage release preparation, which is now the ONLY path that may publish to the production package. A manual `build-publish.yml` dispatch with `publish: true` is refused by design (see §10.5's publication-trust rows), so the procedure this row used to give no longer exists |
| §10.7 provenance is verified, not merely created | **PENDING RELEASE ACTIVATION** | `build-publish.yml` runs `gh attestation verify oci://<image>@<digest>` against the repository and signer workflow after the attestation is pushed, and fails the build if verification fails. The step is asserted by a contract test but can only execute on a real publish |
| Release ref is resolved once to an exact SHA | **PASS** | `release-production.yml` has a `resolve` job that pins `inputs.ref` to a commit SHA; the gate and the build both consume that SHA, so a branch moving mid-workflow cannot ship ungated code. The cutover then names a digest rather than a ref, so there is nothing left to move |
| SSH host identity is pinned, not trust-on-first-use | **PASS** | The workflow requires a `VPS_SSH_KNOWN_HOSTS` secret, writes it to `known_hosts`, uses `StrictHostKeyChecking=yes` and aborts when the secret is absent. A contract test fails if `ssh-keyscan` is ever wired into `known_hosts` or the strictness is relaxed |
| The real host key is captured and stored | **PENDING REAL VPS** | There is no server whose key can be read from the console |
| §10.8 pin actions to full commit SHAs | **PASS** | All eight third-party actions are pinned to full 40-character commit SHAs, each with the release it came from in a trailing comment. The SHAs were resolved with `git ls-remote` against each action's own repository — the egress proxy denies the GitHub REST API for out-of-scope repositories, but the git protocol is reachable, so nothing here is invented. A contract test fails the build if any `uses:` reverts to a tag or loses its version comment |
| §15.1 bounded Docker logs | **PASS** | |
| §17 build-time PostgreSQL error noise | **NOT DONE** | **The build still attempts PostgreSQL connections.** A measured `docker build` logs ~10 × `cannot connect to Postgres … ECONNREFUSED 127.0.0.1:5432`. Next's static generation initializes Payload's Local API for some routes, and Payload's adapter logs the failed connection before the build continues successfully. The build does **not** require a database and completes without one — but it is *not* connection-free, and no acceptance item may claim otherwise. Removing it entirely would mean changing route rendering semantics, which §17 explicitly forbids doing solely to silence the message. `next.config.ts` and the builder stage keep the build DB-*independent* (no credentials, no reachable server, both runtime flags pinned off); the noise is expected and asserted, not fixed |
| §19.1–19.3 env profiles + runbook | **PASS** | `.env.example` rewritten into profiles, `deploy/.env.production.example`, `deploy/README.md` |

---

## Scope boundary: where production's first dataset comes from

> **This section replaces an earlier one that said production data migration was
> out of scope.** That was accurate when it was written — there was no populated
> dataset anywhere. It is no longer accurate: a real pre-versioning dataset was
> exported from Neon, converted and corrected on staging, and accepted there.
> The statement is corrected rather than quietly dropped.

Two different lifecycles are now supported, and they must not be confused:

| | empty first install | first install from a platform backup |
| --- | --- | --- |
| Starting point | an empty PostgreSQL cluster | a **verified** backup from `deploy/scripts/backup.sh` |
| What creates the schema | the committed migrations, at container start | the dump, restored before any release exists |
| What creates content | nothing broad — the minimal identity bootstrap only | the accepted dataset the backup carries |
| Super Admin | created from `INITIAL_ADMIN_*` | already present; **validated**, never recreated |
| Mechanism | `deploy/scripts/deploy.sh` | `deploy/scripts/initialize-from-backup.sh`, then `deploy.sh` |
| Proven by | first-install drill, phases 1–6 | first-install drill, phase 7 + `tests/deploy/initialize-guard-drill.sh` |

Production uses the second. Its dataset lineage is:

```
frozen Neon -> corrected migration on STAGING -> accepted staging
  -> final verified staging platform backup -> production
```

Three things this deliberately does **not** do:

- **It does not re-run the conversion.** `migration/scripts/neon-import.sh`
  refuses production with no override, and is not installed on a production
  host. It converts a *source* schema — a rehearsal. Production restores an
  already-correct one.
- **It does not weaken `restore.sh`.** That script still refuses a non-production
  backup against production outright, with no acknowledgement string. Founding an
  EMPTY environment is a different operation, so it has its own script whose
  safety property is inverted: prove nothing is being overwritten.
- **It does not seed.** Both Seed modes are refused in production, in three
  independent places.

The data ETL the earlier text called a "separate production-cutover blocker" was
in fact done, on staging: the object-ownership correction and the canonical
Payload version backfill, both gated and accepted there. What reaches production
is their *result*, carried in a backup — not the machinery that produced it.

---

## Follow-ups before the production release path is switched on

1. Create the `production` GitHub Environment, restricted to the release ref,
   with `VPS_SSH_*` secrets; set `PRODUCTION_VPS_READY=true`,
   `PRODUCTION_SERVER_URL=https://aau.edu.ye` and `PRODUCTION_RELEASE_REF=main`.
   Leave `PRODUCTION_PUBLIC_READY` **unset** until the domain is cut over — see
   `deploy/README.md` §12b.
2. Enable branch/ruleset protection on the release ref.
3. Run **Prepare production release** once, which is the only path that can
   publish a production artifact. (`build-publish.yml` cannot publish when
   dispatched manually, by design, so there is no manual publish to run.)
   Record the digest it reports.
4. Capture the VPS host key on the console and store it as `VPS_SSH_KNOWN_HOSTS`.
5. Provision the deploy account with the authorized_keys forced command
   (`ssh-forced-command.sh`) and the root-owned `deploy-entrypoint.sh` sudo rule
   exactly as documented in `deploy/README.md` §3/§4, and install the CI public
   key. Do **not** install `seed-entrypoint.sh` on the production host: the Seed
   is a staging capability and the production copy refuses itself.
6. Work through the `PENDING REAL VPS` checklist in `deploy/README.md`.

### Exact GitHub configuration still required

| Kind | Name | Value | Needed for |
| --- | --- | --- | --- |
| Variable | `PRODUCTION_RELEASE_REF` | `main` | Lineage authorization. Unset = nothing can be released. |
| Variable | `PRODUCTION_SERVER_URL` | `https://aau.edu.ye` | Baked into the image at build time. |
| Variable | `PRODUCTION_VPS_READY` | `true` | Permits a real cutover. |
| Variable | `PRODUCTION_PUBLIC_READY` | `true`, **only after DNS** | Turns the public HTTPS probe back into a gate. |
| Variable | `ARTIFACT_ATTESTATIONS_AVAILABLE` | `true` if the plan supports it | Build provenance attestation. |
| Environment | `production` | restricted to `main`, required reviewers | Both approval gates. |
| Secret | `VPS_SSH_HOST` / `VPS_SSH_USER` / `VPS_SSH_PORT` | the production deploy account | Cutover. |
| Secret | `VPS_SSH_KEY` | the CI private key | Cutover. |
| Secret | `VPS_SSH_KNOWN_HOSTS` | host key captured on the console | Cutover; there is no trust-on-first-use fallback. |

---

# Second review round — new and revised criteria

Everything below was added or re-evaluated in the second independent review of
this PR. Each row names the evidence, and each `PENDING` row names what is
actually missing rather than implying it is nearly done.

## S1. Secrets and configuration contract

| Criterion | Status | Evidence |
| --- | --- | --- |
| Compose env-file parsing is measured, not assumed | **PASS** | `env-contract-drill.sh` re-measures on every run: `$` is interpolated, ` #` truncates, double-quoted escapes are processed, only single quotes are literal |
| A hostile-but-valid password reaches the container unchanged | **PASS** | `env-contract-drill.sh` step 1 compares `od -c` of the delivered value against the source bytes for `p@ss:w/rd?x=1&y#z$HOME${HOME}%20 end!` |
| No shell evaluation of secret material | **PASS** | `read-env.sh` never `source`s; the deployment-contract test asserts no `source "$ENV_FILE"` anywhere |
| The second parser cannot silently disagree with Compose | **PASS** | `read-env.sh` refuses unquoted `$`, inline ` #`, double-quoted `$`/backslash and unterminated quotes; `env-contract-drill.sh` step 3 asserts each refusal |
| The application password exists in exactly one place | **PASS** | `DATABASE_URI`/`DATABASE_DIRECT_URI` removed from the env contract; `database-url.test.ts` proves URI assembly and percent-encoding |
| PostgreSQL URI reserved characters are handled | **PASS** | `database-url.test.ts`: `@` cannot change the host, `/` cannot introduce a database, round-trip equality for every reserved character |
| Config validation prints no secrets | **PASS** | error messages name variables, never values |
| Malformed configuration fails closed | **PASS** | `${VAR:?}` on every required variable (measured: an *empty* value also fails, not just a missing one); an empty `DATABASE_PASSWORD` is refused |

## S2. Release identity

| Criterion | Status | Evidence |
| --- | --- | --- |
| One authoritative release-state record | **PASS** | `deployed-image`, written only by a successful deploy or restore |
| A stale `APP_IMAGE` cannot resurrect an old release | **PASS** | removed from the env file; no compose default; first-install drill asserts `compose config` fails without it |
| The deployed digest is reconstructible and auditable | **PASS** | state file + `metadata.json` in every backup + the image's `org.opencontainers.image.revision` label |
| Digest resolution cannot pick another repository's digest | **PASS** | measured defect: `RepoDigests[0]` resolved a request for the AAU repository to an unrelated repository's digest. Now selects by requested repository and fails closed |

## S3. Failed-candidate lifecycle and traffic gating

| Criterion | Status | Evidence |
| --- | --- | --- |
| No request reaches a candidate before migrations, bootstrap and the health gate | **PASS** | `cutover-gating-drill.sh`: a continuously live proxy polls the stable port through the whole replacement of a candidate that binds its port and answers 500; every observation is 200 or connection-refused |
| The failed candidate is stopped and PROVEN stopped before the ledger is read | **PASS** | `deploy.sh` orders stop → proof → ledger; contract test asserts the ordering; first-install drill 5a exercises it |
| A failed candidate does not crash-loop during investigation | **PASS** | `app-candidate` is `restart: 'no'`; the gating drill asserts no candidate container survives |
| First-install failure leaves the failed app stopped | **PASS** | first-install drill phase 5a |
| "Leaving the stack stopped" messages are truthful | **PASS** | rewritten to describe what is actually running; the previous release is never interrupted by a failed candidate |
| A deploy is one honest maintenance window, not a hidden overlap | **PASS** | the previous release is stopped before the candidate migrates. Leaving it up would make the outage look shorter while old code — and old WRITES — ran against a schema it was not built for. The gating drill asserts the window genuinely happens (the stable port goes quiet) AND that nothing on it is ever answered by the unhealthy candidate |
| A recoverable failure closes the window again | **PASS** | schema unchanged → the previous release is restarted automatically; gating drill step 3 and first-install drill 5b |
| An unrecoverable failure leaves the service deliberately down | **PASS** | schema changed → the previous build predates it, so it is NOT restarted, and the message says why; first-install drill 5a |
| A standalone quiesced backup never causes an outage | **PASS** | EXIT trap covering success, failure and interruption. deploy.sh opts out because it owns the lifecycle through the window |

## S4. Operation locking

| Criterion | Status | Evidence |
| --- | --- | --- |
| deploy \|\| restore \|\| backup \|\| seed are mutually exclusive | **PASS** | `operation-lock-drill.sh` races real processes for each pairing |
| deploy → backup does not self-deadlock | **PASS** | exported holder handoff; drill step 3 |
| A stale handoff from a dead holder does not grant the lock | **PASS** | drill step 4 (holder PID liveness re-checked) |
| Lock semantics under SIGKILL are documented and asserted | **PASS** | drill step 6 measures that an inherited descriptor keeps the lock while in-flight work runs, and that it frees when the tree exits |
| Production and staging locks are separate | **PASS** | `environment-isolation-drill.sh` |

## S5. Restore safety

| Criterion | Status | Evidence |
| --- | --- | --- |
| The application is proven unable to write before `DROP SCHEMA` | **PASS** | container confirmed stopped AND `pg_stat_activity` proven empty for the app role; contract test asserts `compose stop app-prod \|\| true` is gone |
| The dump is proven readable before the live schema is dropped | **PASS** | `pg_restore --list` in the verification phase; contract test asserts the ordering |
| Uploads are staged before any destructive DB work | **PASS** | extraction, chown and a space preflight all precede the destructive section |
| A failed second rename cannot delete the live uploads | **PASS** | measured defect: the old fallback operated on a path that no longer existed. The rename pair is now explicitly rolled back, with a "nothing has been deleted" terminal message |
| An unverifiable backup cannot silently drop the schema | **PASS** | missing MANIFEST/SHA256SUMS/metadata now fails closed behind `ALLOW_UNVERIFIED_BACKUP=I-ACCEPT-POSSIBLE-DATA-LOSS` |
| Backup and image retention are one contract | **PASS** (documented + tested) | `restore.sh` fails with an explicit retention message; contract test asserts it |
| A restore from an OFF-HOST copy has been performed | **PENDING REAL VPS** | no off-host destination exists yet. This is the drill that actually matters |

## S6. Backup safety

| Criterion | Status | Evidence |
| --- | --- | --- |
| Artifacts are never world-readable | **PASS** | `umask 077` plus asserted `0700`/`0600` |
| Concurrent backups cannot share a destination | **PASS** | atomic `mkdir` claim with a random suffix, replacing a second-resolution timestamp |
| A standalone quiesced backup returns the service to its original state | **PASS** | EXIT trap covering success, failure and interruption |
| An incomplete backup is removed rather than left restorable | **PASS** | EXIT trap deletes the target unless the run completed |
| Capacity preflight, with its limits stated | **PASS** | a free-space floor before starting; the docs state plainly that it is not a guarantee (compressed dump size is unknown in advance, other processes write concurrently) |
| Off-host copy exists | **PENDING REAL VPS** | — |
| Real shared-filesystem exhaustion | **PENDING REAL VPS** | CI uses an isolated tmpfs, which does not reproduce Docker + PostgreSQL + uploads + logs + backups filling one filesystem together |

## S7. Dirty-database detection

| Criterion | Status | Evidence |
| --- | --- | --- |
| Non-table user objects are detected | **PASS** | counts views, materialised views, sequences, functions, custom types and non-`public` schemas via `pg_class`/`pg_proc`/`pg_type`/`pg_namespace` |
| An unclassifiable database is never assumed fresh | **PASS** | a query error is a hard failure |

## S8. Production origin

| Criterion | Status | Evidence |
| --- | --- | --- |
| Path, query, fragment, userinfo and non-HTTPS are rejected | **PASS** | `public-origin.test.ts`, 15 invalid forms. Mutation check: removing the path guard fails exactly 4 tests |
| The origin is canonicalised, not merely accepted | **PASS** | `https://AAU.Example:443/` → `https://aau.example` |
| One implementation for runtime and build | **PASS** | `src/lib/public-origin.ts`, called by the runtime and by the Dockerfile's build-time gate. The duplicate shell rules in the workflow are gone |

## S9. Supply chain and publication

| Criterion | Status | Evidence |
| --- | --- | --- |
| Only the approved release path can publish | **PASS** | `build-publish.yml` has no manual publish input, and refuses `publish` whenever it is itself the dispatched workflow (`github.workflow_ref == job.workflow_ref`), while a gated `workflow_call` from `release-production.yml` / `deploy-staging.yml` is not refused |
| Approval precedes publication | **PASS** | the `authorize` job carries the `production` Environment and the typed confirmation, and `build` depends on it |
| A mistyped confirmation publishes nothing | **PASS** | the confirmation is checked in `authorize`, before `build` |
| Staging and production artifacts are distinct | **PASS** | separate GHCR packages; the entrypoint accepts only its own channel |
| The consumer authorizes a RELEASE, not just an artifact | **PASS** | root-owned `release-policy.conf`, fails closed when absent; optional per-digest allow-list |
| Actions pinned to full commit SHAs | **PASS** | contract test enforces it |
| Base images digest-pinned and kept current | **PASS** | Dependabot `docker` for `/` (Dockerfile) and `docker-compose` for `/deploy` (the vps compose file) |
| npm dependencies have an update policy | **PASS** | Dependabot `npm` added, grouped, with Payload packages excluded because they must move as a set |
| Dependency vulnerability gate | **PASS** | `pnpm audit:dependencies` compares against a recorded baseline: it fails on any advisory NOT already known, and also fails when a baselined one disappears, so the baseline cannot rot into an exemption list. Both failure modes mutation-checked |
| Pre-existing dependency vulnerabilities | **NOT DONE / DEFERRED — baselined, shrinking** | The gate's first run found 24 high/critical advisories in the tree. `next` (4 high) and `sharp` have since been **fixed at source** (sharp via 0.35.3 + traced `@img` packages), leaving **19** baselined — `brace-expansion`, `fast-uri`, `form-data`, `image-size`, `immutable`, `js-yaml`, `nanoid`, `postcss`, `undici`, all transitive through Payload and Next with no direct upgrade available to this project. Recorded in `.github/security/audit-baseline.json` with a **review date of 2026-11-21**, after which the gate fails until someone re-evaluates them; anything NEW or any baselined one that disappears also fails. Tracked debt, not an exemption |
| Final runnable image and pinned data images scanned | **PASS** | Trivy (digest-pinned) against the runner image and the exact PostgreSQL/Redis digests |
| Secret-leakage gate | **PASS** | Trivy secret scan plus an image-history check for secret-shaped values |
| SBOM | **PASS** | generated as a CI artifact. Deliberately **not** attached to the image: `sbom: true` would make the push an OCI index and change the digest shape the VPS pins |
| Build provenance attestation | **PENDING GITHUB CONFIGURATION** | GitHub artifact attestations require **GitHub Enterprise Cloud** for private repositories. This repository is private and personally owned, so the attest step cannot succeed on the current plan. It is gated on `ARTIFACT_ATTESTATIONS_AVAILABLE` and the build summary states which situation applies. Leaving an unconditional attest step would have been a guaranteed failure the first time it was used for real |

## S10. Staging as a first-class environment

| Criterion | Status | Evidence |
| --- | --- | --- |
| Compose project, ports, volumes, uploads, backups, state, lock and env are all distinct | **PASS** | `environment-isolation-drill.sh`, 21 assertions including real Compose object names |
| Neither environment root is nested in the other | **PASS** | drill step 2 |
| Staging cannot deploy production | **PASS** | fixed `channel: staging`; the entrypoint derives its environment from its own installed path |
| Shared deployment logic, not a second copy | **PASS** | one `deploy.sh`, parameterised by `deploy/scripts/lib/environment.sh` |
| Staging release source is configurable | **PASS** | `STAGING_RELEASE_REF`, so `develop → staging` / `main → production` is a settings change |
| Staging resource limits bound the shared host | **PASS** (configured) / **PENDING REAL VPS** (values) | set in the staging env example; the values are starting points, not measurements. The host has **no swap** |
| Production resource limits | **CONFIGURED; measurement PENDING REAL VPS** | Bounded Compose defaults are set and documented (`APP_MEM_LIMIT`, `POSTGRES_MEM_LIMIT`, `REDIS_MEM_LIMIT` and their PIDs counterparts in `deploy/.env.production.example`), with the budget written out — the policy row at §9 records the same. What is deferred is TUNING them: the figures are a safe budget for a ~11 GiB host with no swap, not a measurement of this application under real load, and inventing tighter numbers without measuring risks OOM-killing production |
| Staging deployed to a real host | **PENDING REAL VPS** | — |

## S11. Seed policy

| Criterion | Status | Evidence |
| --- | --- | --- |
| The broad Seed never runs at startup | **PASS** | `seed-one-shot-drill.sh` steps 6–7: no broad content after a deploy or after a restart, while Roles do exist |
| No `FULL_SEED` env toggle exists | **PASS** | the drill and the contract tests assert the absence |
| The Seed is an explicit one-shot operation that verifies itself | **PASS** | drill step 8 |
| The Seed artifact is source-free | **PASS** | one bundled `.mjs`; no `/app/src`, no Payload CLI; `assert-runner-image.sh` loads it inside the image to prove its module graph resolves |
| `reset-and-full` is impossible in production | **PASS** | refused in `seed.sh`, `seed-entrypoint.sh` and the runner itself; drill steps 3 and 10 |
| **Both** Seed modes are impossible in production | **PASS** | `full` was previously reachable behind `SEED_CONFIRM` for a "deliberate first-install content initialisation". That use case is now `initialize-from-backup.sh`, so the confirmation was removed from all three layers rather than left in place — a retired escape hatch still named in the code reads as a supported one. Drill steps 4, 10 and 11 assert the refusals and that no confirmation variable survives anywhere in the seed path |
| No HTTP seed endpoint is required for automation | **PASS** | the staging workflow triggers it through the forced command, not an endpoint |
| The minimal identity bootstrap stays separate | **PASS** | unchanged; `seed-isolation.test.ts` |

---

## P. First production launch — LOCAL READY, then LIVE

The lifecycle in `deploy/README.md` §12b. Everything below is **repository
behaviour**; nothing here has been exercised against the real production host,
and the table says so where that is the case.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Production reuses the staging deployment engine | **PASS** | `deploy.sh`, `backup.sh`, `restore.sh`, `compose.vps.yml` and the entrypoints are shared; only the environment descriptor differs (`lib/environment.sh`). `environment-isolation-drill.sh` asserts every per-environment resource differs |
| No second deployment system was created | **PASS** | the additions are one host script, two workflows and a drill. No new engine, no new candidate/promotion model, no rewritten backup or restore |
| The prepared artifact is the deployed artifact | **PASS** | `deploy-production.yml` never calls `build-publish.yml` and carries no `publish: true`; contract-tested |
| Only approved `main` lineage can produce a production artifact | **PASS** | `release-production.yml`: containment + `production` Environment + typed `PUBLISH`, all before `build` |
| Only approved lineage can be **deployed** | **PASS** | `deploy-production.yml` re-derives the commit from the artifact's own `org.opencontainers.image.revision` label and checks that, so the operator cannot authorize a commit other than the one that built the image |
| Only immutable production-package digests are accepted | **PASS** | digest shape validated in CI, the artifact pulled from the production package by digest, and the host entrypoint re-validates shape, channel and release policy independently |
| LOCAL READY is reachable before DNS | **PASS (repository)** | the public probe is conditional on `PRODUCTION_PUBLIC_READY`, and a skipped probe is reported as skipped. LOCAL READY is proven by the cutover itself: `deploy.sh` promotes only after the candidate passes `/api/health`. **PENDING REAL VPS** to actually reach it |
| The production image is still built for the real origin | **PASS** | `release-production.yml` refuses an empty `PRODUCTION_SERVER_URL`, and `build-publish.yml` refuses to publish a `localhost`/`.invalid` origin. `NEXT_PUBLIC_SERVER_URL` is inlined at build time, so this is the artifact's identity |
| Public acceptance needs no redeploy | **PASS** | `verify-production-public.yml` curls the origin and nothing else — no build, no host access, no maintenance window |
| First data initialization comes from the accepted dataset | **PASS** | `initialize-from-backup.sh`; `initialize-guard-drill.sh` (17 assertions, no Docker) and first-install drill phase 7 (real database) |
| Neon import remains staging-only | **PASS** | unchanged: refuses production with no override, and the migration tree is not installed on a production host |
| Initialization refuses a non-virgin target | **PASS** | five independent live-state checks; phase 7 deletes the receipt and re-runs, and the refusal cites the migration ledger |
| Initialization refuses a tampered or incomplete artifact | **PASS** | `initialize-guard-drill.sh` §2–§3, including that `restore.sh`'s unverified opt-in does **not** apply here |
| Restored objects belong to the application role | **PASS** | `--no-owner --role`, then an ownership contract the script asserts itself; phase 7 re-checks it against the restored database |
| The imported-database / no-previous-release deploy is safe | **PASS** | phase 7e. This was a real defect: `backup.sh` had no image reference to parse the compose file with, so the pre-cutover backup failed and the first production deployment could never happen |
| The FIRST imported-baseline deployment is recoverable when it fails | **PASS** | phase 8. The remaining gap after phase 7e: that deployment's pre-cutover backup records **no** application image (none has ever existed here), and `restore.sh` refused exactly that backup — so the documented recovery for the first production launch could not run. `restore.sh` now performs a **baseline recovery** in that state: database and uploads only, nothing started, no release identity invented. Phase 8 founds an environment, fails a first deployment *after* it applies a migration, recovers with no `RESTORE_IMAGE`, and asserts the ledger, user count, role set, content rows and uploads are back at the baseline, that no release-state file or active candidate remains, that the stable port is honestly down, that neither the Neon import nor any Seed was invoked — and then that the recovered baseline still deploys |
| Baseline recovery cannot fire on an environment that has a release | **PASS** | all four conditions must hold (no recorded image, no `RESTORE_IMAGE`, no release-state file, no `app-prod` container ever created). An unreadable `docker ps` is treated as "a release exists", never as virgin. Pinned in `vps-deployment-contract.test.ts` |
| Restored uploads are writable by the application identity | **PASS** | this was `chown \|\| log WARNING`: an initialization that reported success and then could not accept a single upload. Ownership is now a **post-condition** — the tree is enumerated and every entry checked against UID:GID 10001 the way the kernel resolves it, so neither a partial `chown -R` nor an untraversable tree passes. Phase 7b-bis injects an unwritable entry and asserts the refusal, and asserts it came from the assertion rather than from `chown`'s exit status |
| Migrated passwords are never replaced | **PASS** | the bootstrap validates an existing Super Admin and only creates a missing one; initialization refuses when `INITIAL_ADMIN_EMAIL` is absent from the restored dataset, so this is caught before any deployment |
| The real production data initialization has been performed | **PENDING REAL VPS** | not done by anyone. Agent B / an operator, on the host |
| The real production cutover has been performed | **PENDING REAL VPS** | not done. **Production has NOT been deployed.** |
| DNS / Apache / TLS / firewall cutover | **PENDING REAL VPS** | host-side, after LOCAL READY |

## S12. Networking claims

| Criterion | Status | Evidence |
| --- | --- | --- |
| No false host-isolation claim | **PASS** | corrected in the compose file, README and this document: `internal: true` removes the gateway, it does **not** isolate from the Docker host |
| Redis requires authentication | **PASS** | `requirepass`, and the app authenticates with the same credential |
| The Redis password is not in argv | **PASS** | written to a private config file inside the container, because `/proc/<pid>/cmdline` is world-readable on a host shared with other cPanel accounts |
| Public exposure verified | **PENDING REAL VPS** | must be tested from OUTSIDE the host; `ss`/`netstat` on the host cannot see what the firewall does to remote traffic |

## S13. Apache / cPanel

| Criterion | Status | Evidence |
| --- | --- | --- |
| A cPanel-compatible reverse-proxy reference exists | **PASS** | `reverse-proxy/apache-cpanel.conf.example` |
| Generated cPanel config is never edited | **PASS** (documented) | userdata include surface only |
| mail/cpanel/webmail/ACME paths are excluded | **PASS** (documented) | explicit `ProxyPass ... !` rules plus per-vhost scoping |
| Real Apache behaviour | **PENDING REAL VPS** | the CI proxy simulation uses nginx and is a generic reference. Nothing here has been run against Apache |

## S14. Workflow truthfulness

| Criterion | Status | Evidence |
| --- | --- | --- |
| A failed public smoke test is not reported as "Deployed" | **PASS** | the report step distinguishes success, host-cutover failure and smoke failure, and gives different remediation for each |
| Smoke failure does not advise rolling back after a migration | **PASS** | the report says so explicitly and points at `restore.sh` |

---

## T. Third remediation pass — gates that were green without being true

Every row here replaced a check that PASSED while the property it names was
violated. Each is verified by a drill that includes a mutation step running the
previous logic and requiring it to FAIL, because a regression test that cannot
fail on the bug it was written for proves nothing.

| Item | Status | Evidence |
|---|---|---|
| The Trivy gate can actually fail | **PASS** | The helper printed HIGH/CRITICAL findings and exited 0: `set -e` is suspended inside a function called as the left operand of `\|\|`, and a trailing `echo "::endgroup::"` overwrote the return status. Reproduced, then moved to `scripts/trivy-image-scan.sh`. `tests/security/trivy-scan-gate-drill.sh` — 20 assertions, incl. scanner-crash, unpinned data image, the split policy, and a mutation step asserting the old shape returns a false green |
| Runner image (ours) hard-gated on fixable HIGH/CRITICAL | **PASS** | The application-owned runner image blocks on any fixable HIGH/CRITICAL, and blocks too if the scanner cannot run. It currently reports **zero** (npm CLI removed, sharp resolved — §T-red, §T-debt), confirmed by CI run `32499307471` and locally against a same-hour Trivy DB. `scan_blocking` in `trivy-image-scan.sh` |
| PostgreSQL image scanned and REPORTED | **PASS (report-only)** | `postgres:18.6-bookworm` carries 22 upstream findings (21 HIGH, 1 CRITICAL — mostly the bundled `gosu` Go stdlib), with no newer compatible official image that resolves them (verified; re-pinning 18.4→18.6 did not help). Scanned on every release and reported; does not block. A scan that could not run, or an unpinned reference, DOES block. Not called "safe": monitored upstream debt |
| Redis image scanned and REPORTED | **PASS (report-only)** | `redis:8.8.2-trixie` carries 36 HIGH in its Debian 13.6 `util-linux` layer; re-pinning 8.8.0→8.8.2 did not help (upstream has not rebuilt). Scanned and reported; does not block; a scanner failure or unpinned reference blocks |
| Vulnerability finding ≠ scanner failure | **PASS** | The distinction the split hangs on. `--exit-code 0` makes Trivy exit 0 on an image WITH findings and non-zero only on an operational error (verified against the pinned Trivy: findings→0, nonexistent image→1). So report-only images pass on findings but a scan that never ran fails closed. No `\|\| true` anywhere, which would swallow exactly that case. `trivy-scan-gate-drill.sh` steps 3, 4, 6 |
| An earlier "no findings" claim, corrected twice | **Recorded, not dropped** | This document once recorded the data images as clean from a LOCAL scan. Wrong: it had run against a stale DB. Then it said the Trivy DB was simply unreachable from this sandbox — also wrong: with the proxy CA mounted and the container on the host network, Trivy downloads a current DB and scans normally, which is how the runner-image zero above was measured locally. Both corrections are kept here rather than quietly deleted |
| Image secret scan evaluates every occurrence | **PASS** | The approved build placeholder exempted the WHOLE image, so a real credential in another layer was suppressed. `scripts/assert-no-image-secrets.sh` decides per occurrence and also reads `Config.Env`. `tests/security/image-secret-scan-drill.sh` — 17 assertions; step 3 (placeholder + separate real leak) fails, and the mutation step confirms the old logic passed it |
| `reset-and-full` works in staging | **PASS** | Policy keyed on `NODE_ENV`, which the runner image sets to `production` in **every** environment — so the staging-only operation refused itself in staging. Now keyed on `AAU_ENV` (`src/seed/lib/deployment-environment.ts`, fail-closed on unset/empty/unknown). `seed-one-shot-drill.sh` step 12 runs a real staging reset against a live database and asserts a local edit is reverted to the fixture value |
| Destructive `reset-and-full` fails CLOSED after partial reset | **PASS** | Each seed stage commits in its own transaction (verified in `run-seed.ts`), so a late failure leaves staging partially reset. The EXIT trap used to restart the app unconditionally — serving a half-reset site as healthy. Now a `reset-and-full` failure keeps app-prod stopped, prints the exact pre-seed restore point (from `backup.sh`'s stdout contract) and the `restore.sh` command, and exits non-zero. `seed-one-shot-drill.sh` step 13 injects a genuine post-destructive failure (a superuser trigger blocking the 14th-stage `pages` write while the 10th-stage `news` reset has already committed) and asserts: exit non-zero, app-prod not running, not serving, pre-seed backup exists, exact recovery path is a real directory, and the news reset genuinely happened |
| The two seed failure classes are handled OPPOSITELY | **PASS** | Class B (row above) is a destructive-seed failure: keep the app DOWN. Class A is the opposite — the **pre-seed backup** fails BEFORE any reset, so the database is untouched and leaving staging dark would be an outage with no upside. Taking the backup requires stopping the app first, so a naive class-A path left the app down exactly like class B; the prior comment even claimed backup.sh restarts the app itself (it does not — seed.sh passes `RESTART_AFTER_QUIESCE=false`). Now `seed.sh` restarts the prior service and refuses the reset on a class-A failure. `seed-one-shot-drill.sh` step 12b forces a deterministic pre-seed-backup failure (an impossible free-space floor, which `backup.sh` checks AFTER quiescing) and asserts: exit non-zero, reported as a pre-seed backup failure, NOT reported as a destructive/partial failure, app serving again, and the database not reset |
| Quiesced backup freezes EVERY application writer | **PASS** | `QUIESCE_APP=true` recorded `consistency=quiesced` after stopping only `app-prod`, so an orphan `app-candidate` from an interrupted deploy could keep writing while the backup claimed a coherent instant. Now `backup.sh` uses the shared `writers_freeze` (same definition as restore) and records `quiesced` only after proving every writer stopped. `backup-restore-drill.sh` starts an orphan `app-candidate`, takes a quiesced backup, and asserts the candidate was stopped BEFORE the `quiesced` label was earned. A second phase covers the harder half — a **one-off** `compose run` application container (`oneoff=True`, the same shape as the one-shot Seed): no `compose stop <service>` addresses it, so `writers_freeze` must find it by label and stop it explicitly. The freeze stops every active application container because any of them could be mid-write; the drill starts a real one-off container (a `sleep`, so the assertion is about the container class, not that this particular one is writing), confirms `oneoff=True`, takes a quiesced backup, and asserts the one-off was stopped before the `quiesced` label was earned |
| Writer-state proof fails CLOSED and tolerates only transient states | **PASS** | "Cannot observe" must never read as "observed safe": if `docker ps` itself fails, `writers__active_set` returns rc 2 and `writers_freeze` refuses to claim the writers are frozen. And a one-off from a just-finished `compose run` can sit in `removing` for a moment, so the proof bounded-retries (`AAU_WRITERS_FREEZE_ATTEMPTS`×`AAU_WRITERS_FREEZE_INTERVAL`) rather than failing on the first sample, while a genuinely active writer never clears and still fails. `writers-freeze-drill.sh` proves all four with a `docker` stub: enumeration failure fails closed, a transient `removing` container is waited out, a permanently active writer fails, and a clean project passes. Wired into the release gate's `quality` job (no Docker needed) |
| Compose image override requires explicit acknowledgement | **PASS** | An ambient `APP_IMAGE` env override silently swapped the running release — the exact hole `compose.sh` exists to close. It must now be digest-pinned (unchanged), and when the requested digest DIFFERS from the recorded release it is refused unless `ALLOW_IMAGE_OVERRIDE=I-UNDERSTAND-THIS-BYPASSES-RECORDED-RELEASE` is set; read-only inspection and the recorded release need no acknowledgement, and an override never advances the release-state file. `compose-override-drill.sh` 14/14 |
| Redis authenticates with a hostile password | **PASS** | The Compose-assembled URI broke on `/`, `#`, `?`, `%` (measured against Node's URL parser). Structured host/port/username/password instead. `redis-credential-drill.sh` deploys the real stack and drives public form submissions — 429 proves Redis reachable and authenticated, 503 is the symptom a broken URI produces. Wrong-password and no-password cases asserted so the pass is not vacuous |
| Cross-environment restore fails closed | **PASS** | `backup.sh` always recorded the source environment; `restore.sh` never read it. staging→production is refused outright with no override; production→staging needs an explicit acknowledgement **and** a target-channel `RESTORE_IMAGE`. Database identity checked too. `restore-guard-drill.sh` §A |
| Restore image authorized by EXACT repository identity | **PASS** | The channel check was a suffix heuristic (production rejected `*-staging`), which is not a release boundary: `ghcr.io/attacker/aau-payload-platform` and `…-staging-evil` both passed it in production. Now matched EXACTLY against the same `ghcr.io/<owner>/aau-payload-platform[-staging]` identity `deploy-entrypoint.sh` enforces. `restore-guard-drill.sh` §A7 rejects all three attacker repositories and confirms the exact approved repository passes the gate |
| Restore proves ALL writers frozen, and PROVES the app cannot reconnect | **PASS** | Two defects. (1) Only `app-prod` was stopped; `app-candidate` and one-off Seed containers kept writing, and `--status running` never reports a crash-looping `restarting` container. Now `deploy/scripts/lib/writers.sh` (shared with backup, so the definition cannot drift) stops every writer and proves none is active. (2) The freeze used `REVOKE CONNECT`, which does **not** stop the app reconnecting — `CONNECT` is granted to `PUBLIC` by default and the role inherits it (reproduced against the pinned image: the app role opened a fresh TCP session after the revoke). Now `ALTER ROLE … NOLOGIN`, and the restore attempts a REAL TCP login as the app role and requires the "not permitted to log in" rejection before dropping the schema. `LOGIN` is restored via an EXIT trap and a reconnect is proven after. `restore-guard-drill.sh` §B: B1 fails after the barrier and B2 proves LOGIN was restored; B4 proves the mid-freeze TCP rejection appears in the restore's own log |
| Promotion failure recovers, deciding from a FROZEN state | **PASS** | Failure after candidate health but before the stable port served had no recovery, and a port conflict aborted the script under `set -e` before recovery could run. Now: capture, retry once, then **stop app-prod and PROVE it stopped** (real container-state enumeration, not `compose ps --status running`) before reading the migration ledger. Schema-unchanged restarts the previous release; schema-moved leaves the new image STOPPED (not crash-looping) with restore guidance and does not advance release-state. `promotion-failure-drill.sh` **§B** now reaches and asserts the "schema moved + image cannot serve" branch — the sub-branch the previous round conceded as uncovered — proving app-prod is not running and the stable port serves nothing. 19/19 |
| `wait_for_health` requires the container to be RUNNING | **PASS** | It read `{{.Health}}` alone, and `compose ps --all` includes containers that are not running — so a promotion that never started could be reported as "recovered and is serving". Both conditions now required |
| An UNREADABLE migration ledger is never treated as "unchanged" | **PASS** | The rollback decision keys on whether the schema moved; a failed ledger read (database unreachable, query error) previously risked defaulting to "unchanged" and auto-restarting the previous image against a possibly-migrated schema — the corruption case. `migration_state()` now uses **two** queries to separate KNOWN-EMPTY (missing `payload_migrations` table → `to_regclass` is NULL, rc 0, a first install) from UNKNOWN (query failed, rc 2), and every call site captures the status with `\|\| migrations_after_rc=$?` so `set -e` cannot abort before the UNKNOWN branch runs (proven empirically). On UNKNOWN the candidate-failure and promotion-failure paths keep the service stopped, do NOT restart the previous image, and point at `restore.sh`. Locked by `vps-deployment-contract.test.ts` |
| The built image's revision label is the commit that built it | **PASS** | On a `pull_request` event `github.sha` is the synthetic merge commit, which is NOT what any job checks out (they check out the head sha), so the release-gate builds labelled the image `org.opencontainers.image.revision` with a commit that never built it — the label `restore.sh`/`backup.sh` read to pair a database with its application build. Both release-gate builds (runner-production-simulation and security) now build with `git rev-parse HEAD`, and the simulation job asserts the image's revision label equals HEAD. The production `build-publish.yml` already used `git rev-parse HEAD` |
| The runner runs as a non-root, non-default UID/GID and owns its uploads | **PASS** | The container/runtime identity is `nextjs:nodejs` at **UID/GID 10001:10001** (moved up from 1001 to keep it clear of the low system range). `assert-runner-image.sh` proves it on the built image, not by inspecting the Dockerfile: it runs the image with `--entrypoint sh` (which overrides the command but NOT the image `USER`) and asserts `id` reports `10001:10001`, then performs a **real write** to `/app/uploads` as that user. This caught a genuine latent defect — `adduser --system` had left the primary group as `nogroup` (GID 65534), fixed with `--ingroup nodejs`. Green in **release-gate run #44 (id 32605494366)**, HEAD `c93f000`, step "Runtime-identity assertions". The uploads owner is 10001:10001 across `restore.sh`, `deploy/STAGING_VPS_CONTRACT.md`, and every Docker drill |
| Direct dependencies with available fixes upgraded | **PASS** | next 16.2.9→16.2.11 resolved 4 high advisories. sharp 0.34.5→0.35.3 failed the first attempt (0.35 moves its native binary and libvips into `@img/sharp-*` packages the tracer does not follow → `ERR_DLOPEN_FAILED` at runtime) and was reverted, then **resolved** with `outputFileTracingIncludes` plus a tree-wide `pnpm.overrides` pin — see §T-debt. Removed from the audit baseline because fixed, not suppressed |
| Baseline drift is detected beyond the ID | **PASS** | A GHSA entry's severity can be re-rated and `patched_versions` can go from "no fix" to a real fix while its ID stays the same. `scripts/check-dependency-audit.mjs` compares module/severity/patched; verified by mutation |

### T2. Staging-handoff items closed in the same pass

| Item | Status | Evidence |
|---|---|---|
| Staging deploys automatically on push | **PASS (repo side)** | `deploy-staging.yml` now triggers on push to every branch and a cheap `gate` job compares the pushed branch against `STAGING_RELEASE_REF`, skipping otherwise — deliberately unfiltered so renaming the variable cannot silently stop deployments. The pushed SHA is pinned once in that job, so a later push cannot be deployed by a run that never gated it. `workflow_dispatch` is retained, concurrency stays non-cancelling, and the seed step is guarded with `(inputs.seed_mode \|\| 'preserve')` — the bare comparison was true for the empty value a push event supplies, so an automatic deploy would have run `seed` with no mode |
| Upload restore fails closed | **PASS** | `chown` failure logged a warning and continued, so a restore could report success and leave the app unable to read its own media. Now fails closed and verifies with `find ! -uid 10001` rather than trusting chown's exit status |
| Destructive staging Seed is one maintenance window | **PASS** | Was two: the pre-seed backup restarted the app, which then served content being deleted and re-created underneath it. The app now stays down from restore point through seed, with a trap reopening the window on every exit path. `seed-one-shot-drill` asserts both log markers and that the app serves again afterwards |
| GHCR credentials are separated per environment | **PASS (repo side)** | Every docker call runs as root, so both environments shared `/root/.docker/config.json` and one login authorised pulls from both packages — the contract asked operators to "verify per environment", which the host could not do. `DOCKER_CONFIG` is now per environment. **PENDING REAL VPS**: the two logins, and the negative check that a production digest cannot be pulled with the staging store |
| Container memory is bounded | **PASS (policy)** | Defaults were unlimited on a host with ~11 GiB, **no swap**, shared with cPanel/Apache/MariaDB/mail — an unbounded leak here could have had the OOM killer take MariaDB or Apache. Bounded production defaults with the budget written out, including that a cutover pays the app limit twice. Staging is now budgeted **below** production, reversing what it was. **PENDING REAL VPS**: measurement under load |
| `compose.sh` cannot silently bypass release state | **PASS** | The `APP_IMAGE` override is retained (it is needed during an incident) but must be digest-pinned and prints requested vs recorded to stderr, warning when they differ |
| Apache directives mean what the comments say | **PASS** | `SetEnv proxy-nokeepalive 0` **enabled** nokeepalive: these mod_proxy variables are presence-activated ("enabled when set to any value"). Removed — keepalive is the default. `proxy-sendchunked` re-documented as governing the request body sent upstream, not RSC response streaming |
| The forced command is not owned by the account it constrains | **PASS (documented)** | The header claimed the deploy account owns it. It is what constrains that account, and the environment is derived from its installed path, so ownership of the file *or any parent* is equivalent to controlling it. Contract §7.2 now specifies root ownership along the whole path and for `authorized_keys`. Also removed a stale instruction to hand-edit `DEPLOY_ROOT` for staging, which path derivation replaced. **PENDING REAL VPS**: applying those modes |
| Production release authorization is a stated threat model | **PASS** | `deploy/README.md` §12a records the three designs considered, why all three controls are required, and the operability cost: with `PRODUCTION_RELEASE_REF` unset no production deploy can run, emergency or not, and no break-glass bypass is provided — with the reasoning |

### T-gap. Coverage this pass did NOT achieve

The one gap the previous round recorded here — the promotion-failure sub-branch
where the schema moved and the new image also cannot serve — is now **closed**.
It was uncoverable before because the recovery re-ran `compose up app-prod`
without `--force-recreate`, and `docker start` on an existing container does not
re-check the host bind, so a squatted port did not keep it down and the drill
measured a false "recovered". This round's fix stops the failed image and proves
it stopped rather than crash-looping it (P0-C), which makes the branch genuinely
reachable; `promotion-failure-drill.sh` §B now asserts it — app-prod not
running, stable port serving nothing, restore guidance printed. Nothing remains
in this table.

### T-red. The image vulnerability gate — history, and the split policy adopted

This started as the one unresolved blocker of the pass. It is now **resolved by
a deliberate policy split** (option 3 below), recorded here in full rather than
quietly changed.

**What is true.** The image scan was previously incapable of failing (§T). Once
it worked, it failed on all three images. The runner image (ours) was then
fixed to zero (npm removed, sharp resolved — below). The two third-party data
images still carry upstream findings no change here can resolve, so the gate now
BLOCKS on the runner image and REPORTS on the data images — while a scan that
cannot run, or an unpinned data image, still fails closed.

**What was tried, and what it achieved.** Re-pinning to the newest published
digests, which is the real fix rather than a threshold change:

| Image | Before | After re-pin | Effect |
|---|---|---|---|
| runner base | node 24.15.0 (`libgnutls30 …deb12u6`) | node 24.19.0 (`…deb12u7`) | clears CVE-2026-33845 and CVE-2026-42010, both CRITICAL |
| postgres | 18.4-bookworm | 18.6-bookworm | still 22 (21 HIGH, 1 CRITICAL) |
| redis | 8.8.0-trixie | 8.8.2-trixie | **identical 36 HIGH** — upstream has not rebuilt with the patched Debian 13.6 packages |

**A correction, and the fix it led to.** This section previously said the whole
residue was third-party image content that "this repository cannot fix". For
the runner image that was **wrong**, and the error came from reading the
package names without reading their paths. Run `32495914800` reported 8 runner
findings (7 HIGH + 1 CRITICAL). Every one of them except `sharp` lives in
`/usr/local/lib/node_modules/npm/**` — the npm CLI the *base image* bundles,
with its own vendored copies:

| Package | Version in the image | Fixed in | Where it actually is |
|---|---|---|---|
| `tar` | 7.5.16 (**CVE-2026-59873, CRITICAL**) | 7.5.19 | npm's bundle |
| `ip-address` | 10.2.0 | 10.3.1 | npm's bundle |
| `undici` | 6.26.0 | 6.27.0 | npm's bundle (this project resolves 7.28.0/8.10.0) |
| `brace-expansion` | 5.0.6 | 5.0.7+ | npm's bundle |

Verified directly against the pinned base image rather than inferred: each
version above was read out of `/usr/local/lib/node_modules/npm/node_modules/`
in `node:24.19.0-bookworm-slim`. None of them appear in `pnpm-lock.yaml` at
those versions, which is why `pnpm audit` was clean while the image scan was
not — the two gates were not disagreeing, they were looking at different code.

**A source-free production runtime has no use for a package manager.** The
runner stage now deletes npm, corepack and yarn outright. This is the same
invariant the VPS itself is held to — no build tooling in production — applied
to the image, so it strengthens the architecture rather than exempting it.
`scripts/assert-runner-image.sh` asserts the absence (both generally, via
`command -v`, and by name for the four vendored packages) so a future base-image
bump cannot quietly reintroduce them, and asserts that `node` still runs, so
the removal cannot silently break the runtime instead.

**Measured, not predicted.** Run `32499307471` scanned the image built from
the changed Dockerfile: `aau-runner` went from **8 findings (7 HIGH + 1
CRITICAL) to 1 (1 HIGH, 0 CRITICAL)**. The one that remained was the `sharp`
advisory, which §T-debt records as **since resolved** — so the runner image is
now at **0 fixable HIGH/CRITICAL**, measured locally against a DB published the
same hour and re-measured by CI. The same run's `runner-production-simulation`
job passed every drill against that image, so none of this came at the cost of
a runtime that cannot serve.

**What genuinely remains outside this repository.** The two data images:
`gosu` compiled against a vulnerable Go stdlib in the PostgreSQL image, and
unpatched `util-linux` in the Redis image's Debian 13.6 layer. Only the
upstream publishers can rebuild those. Waiting is the actual remedy, and the
decision below is about them.

**What was deliberately NOT done.** No severity was lowered. No ignore file was
added. `--ignore-unfixed` was already in place and is not what is masking these
— every finding has a fix available upstream, published in no compatible
official image yet.

**The decision, and which option was taken.** Three options were on the table:

1. **Leave it red.** Truthful, but blocks the release path entirely — including
   for changes that have nothing to do with base images, which is how gates get
   learned around.
2. **Baseline it, as the dependency gate does.** Record these advisories with a
   review date, fail on anything new. Consistent with `pnpm audit`, but a real
   reduction in what the gate enforces.
3. **Split the gate.** Hard-block on the runner image (ours, fixable by us);
   report-only on the third-party data images, with Dependabot driving their
   updates; and — critically — still fail closed on a scan that could not run or
   an unpinned data image, because a finding and a blind gate are different
   outcomes.

**Option 3 was implemented** (`scripts/trivy-image-scan.sh`,
`scan_blocking` vs `scan_report`). It is the strongest available: the one
artifact this repository builds and ships reports **zero** fixable
HIGH/CRITICAL, so a hard block on it costs nothing and means something, while
the data images — which no change here can fix — are monitored and reported.
The split is proven by `trivy-scan-gate-drill.sh` (20/20): a runner finding
blocks; a postgres/redis finding is reported and passes; a scanner *failure* on
any image blocks; an unpinned data image blocks; the original false-green
mutation is still caught. Verified against the real scanner: runner blocking =
clean, postgres/redis report = scanned, so the gate is **green**.

Every finding this gate has ever raised against code this repository controls
has been fixed at source rather than excepted — the npm CLI removed from the
runtime, sharp upgraded and its native packages traced in. Nothing was
suppressed. The documentation deliberately does not call the data images "safe":
they carry upstream vulnerabilities, they are continuously scanned and reported,
and they do not block only because no newer compatible official image resolves
them.

### T-debt. Security debt this pass did NOT clear

| Item | Status | Why |
|---|---|---|
| sharp libvips advisory (GHSA-f88m-g3jw-g9cj, high) | **RESOLVED** | sharp 0.35.3, with `outputFileTracingIncludes` naming the `@img/sharp-linux-x64` and `@img/sharp-libvips-linux-x64` packages the tracer cannot infer — it sees only a `require` behind a runtime platform check. Two packages, not the whole `node_modules` tree, so the runner stays minimal. `package.json` also pins sharp tree-wide via `pnpm.overrides`, because **Next depends on sharp itself**: without that both 0.34.5 and 0.35.3 resolve and the image ships the *vulnerable* libvips 8.17.3 next to the fixed 8.18.3 — fixed-looking and not fixed. Verified on the built image: sharp loads and resizes (libvips 8.18.3), `/_next/image` returns a real optimized PNG, production simulation 43/43, seed drill 30/30, and a Trivy scan against a DB published the same hour reports **0 fixable HIGH/CRITICAL** for the runner image. Removed from `audit-baseline.json` rather than suppressed |
| 19 remaining transitive advisories | **DEFERRED, with a review date** | brace-expansion, fast-uri, form-data, image-size, immutable, js-yaml, nanoid, postcss, undici — all transitive through Payload and Next, none with a direct upgrade available to this project. Recorded in `.github/security/audit-baseline.json` with `review_by`, which the gate enforces |
| `--ignore-unfixed` on the Trivy image scan | **Justified, not hidden** | A CVE with no available fix cannot be actioned by a release gate; blocking on it would make the gate permanently red for reasons no change can address, which is how gates get skipped. Unfixed CVEs belong to the base-image update policy Dependabot drives. Everything with a fix available still counts — hard-blocking on the runner image, reported on the data images (§T-red) |

## What would change these statuses

Nothing in this document moves from `PENDING REAL VPS` to `PASS` because a CI
simulation passed. Each requires the real host:

1. an off-host backup destination, **and a restore performed from it**;
2. an external port scan;
3. a reboot drill;
4. an Apache userdata include that survives a cPanel rebuild;
5. cPanel/mail/MariaDB non-regression after every change;
6. resource measurement under load on a host with no swap.

The repository-side target is **"production-grade repository implementation,
ready for controlled real-VPS staging validation"** — not "production ready".
