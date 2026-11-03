# AAU VPS runbook

Operational guide for the production and staging stacks on the university VPS.

The formal host provisioning contract — every path, mode, port, variable name
and required real-host drill — is **[STAGING_VPS_CONTRACT.md](./STAGING_VPS_CONTRACT.md)**.
This file is the day-to-day runbook that sits on top of it.

Status vocabulary used here and in [ACCEPTANCE.md](./ACCEPTANCE.md):

| Status | Meaning |
|---|---|
| `PASS` | Proven in CI against real containers |
| `PENDING REAL VPS` | Provable only on the real host. A Docker simulation does **not** satisfy it |
| `PENDING GITHUB CONFIGURATION` | Needs a repository or Environment setting |
| `PENDING RELEASE ACTIVATION` | Deliberately off until the host exists |

**Production has not been deployed.** No release has run on the real VPS.

---

## 1. Architecture

```
public HTTPS  ->  CSF  ->  cPanel Apache :443  ->  127.0.0.1:3000   production
                                                    127.0.0.1:13000  staging

                              app-prod ──┬── postgres-prod   (internal network, no host port)
                                         └── redis-prod      (internal network, no host port)
```

Two environments, one host, sharing nothing but the kernel and Apache:

| | production | staging |
|---|---|---|
| Compose project | `aau-production` | `aau-staging` |
| Stable port | `127.0.0.1:3000` | `127.0.0.1:13000` |
| Candidate port | `127.0.0.1:3001` | `127.0.0.1:13001` |
| Root | `/srv/aau/production` | `/srv/aau/staging` |
| GHCR package | `ghcr.io/aau-university/aau-platform` | `ghcr.io/aau-university/aau-platform-staging` |

Properties the design is built around:

- **The VPS is source-free.** No Git checkout, no pnpm, no `next build`, no
  Payload CLI. It receives one prebuilt runner image per release, plus the
  operational scripts in this directory.
- **Release identity is an immutable digest**, recorded in
  `<root>/deploy/deployed-image`. Never a tag, and never in the env file.
- **Payload applies its own migrations** during `db.connect()` from the
  migration list compiled into the image, then a minimal identity bootstrap
  creates missing canonical Roles and the configured Super Admin.
- **The broad canonical Seed never runs at startup**, in either environment.
- **PostgreSQL and Redis publish no host port** and both require
  authentication. `internal: true` removes the network's gateway — it does
  **not** isolate them from the Docker host, which owns the bridge. See §9.

---

## 2. Everyday operations

All of these take the shared per-environment operation lock, so a deploy, a
restore, a backup and a seed can never overlap.

```
# What is running, and on which digest
deploy/scripts/compose.sh ps
cat /srv/aau/production/deploy/deployed-image

# Logs
deploy/scripts/compose.sh logs --tail 200 app-prod

# Deploy a specific release (normally done by CI, not by hand)
deploy/scripts/deploy.sh ghcr.io/aau-university/aau-platform@sha256:<digest>

# Backup on demand
deploy/scripts/backup.sh

# Restore a verified backup
deploy/scripts/restore.sh /srv/aau/production/backups/<timestamp>

# ONE-TIME: found a VIRGIN environment from a verified platform backup (§12b)
ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
  deploy/scripts/initialize-from-backup.sh /path/to/<verified-backup>

# Staging: the same scripts, one variable
AAU_ENV=staging deploy/scripts/compose.sh ps
```

### Why `compose.sh` and not `docker compose`

The compose file has **no default for `APP_IMAGE`**, and the env file does not
contain one. That is deliberate: if a release identity lived in configuration, a
bare `docker compose up` months later would silently start whatever digest was
written there — configuration outliving the release it described. With no
default such a call fails loudly instead.

`compose.sh` supplies the digest from `deployed-image`, which only a successful
deploy or restore writes. Note this means even `docker compose down` needs it;
use `deploy/scripts/compose.sh down`.

**Addressing a different release.** Setting `APP_IMAGE` overrides the recorded
one — for inspecting a release that failed to promote, or starting a specific
build during an incident. It must be digest-pinned (a tag can be repointed after
it is checked, so it is not an identity), and `compose.sh` prints both the
requested and the recorded digest to stderr so the bypass is visible in the
session log. When the requested digest **differs** from the recorded release it
is refused unless you also pass the acknowledgement, so an ambient env var
cannot silently swap the running release:

```
ALLOW_IMAGE_OVERRIDE=I-UNDERSTAND-THIS-BYPASSES-RECORDED-RELEASE \
  APP_IMAGE=<repo>@sha256:<digest> deploy/scripts/compose.sh up --detach app-prod
```

Read-only inspection and using the recorded release need no acknowledgement. An
override does **not** update `deployed-image`: the next deploy still treats the
recorded digest as the previous known-good release, which is what you want
during an incident and worth knowing afterwards.

---

## 3. What a deploy actually does

```
acquire the operation lock
  -> pre-pull the exact digest and resolve it under ITS OWN repository
  -> classify the database (first install / upgrade / refuse)
  -> quiesced backup, verified
  -> [ MAINTENANCE WINDOW OPENS: previous release stopped ]
  -> start the CANDIDATE on 127.0.0.1:3001
       Payload applies pending migrations
       the identity bootstrap runs
  -> the candidate must pass /api/health
  -> ONLY THEN promote it onto 127.0.0.1:3000
  -> [ WINDOW CLOSES ]
  -> record the digest
```

### Why a candidate port

Docker's health status does not stop a reverse proxy sending traffic to a port,
and Next starts listening well before Payload has migrated or bootstrapped. A
candidate bound straight to the stable port would therefore serve real users an
unmigrated build for as long as startup takes.

The candidate is validated on a port no proxy is configured to forward to, so a
migrating or unhealthy build is never reachable by real traffic. This is about
what users are served, NOT about avoiding downtime: by the time the candidate
starts, the previous release has already been stopped (the maintenance window is
open — see below), so the stable port is returning 502/503, not the old build.
The candidate port's job is to ensure that nothing serves the stable port until
a build has proven it migrated and bootstrapped cleanly.
`tests/docker/cutover-gating-drill.sh` proves it with a proxy polling the stable
port for the whole sequence against a candidate that binds its own port and
answers 500 — no unhealthy build is ever promoted onto the served port.

### Downtime is real, and deliberate

A deploy is one continuous maintenance window: the previous release is stopped
after the backup and nothing serves the stable port until the candidate has been
validated and promoted. Apache returns its own 502/503 for that period.

It would be easy to leave the old release up while the candidate migrates — the
site would stay online and the outage would look shorter. It would also be
wrong. The moment a migration applies, the old code is running against a schema
it was not built for. Additively that is harmless; for a dropped or renamed
column it produces errors, and for anything the old code **writes** it can
produce rows the new schema cannot represent. That is a data problem found
later, not an availability problem found now.

On a single VPS with no second instance to fail over to, an honest window is the
right trade. Size it from the migration: the health gate is the slow part.

**A failed candidate does not extend the window indefinitely.** If the schema
did not move, the previous release is a correct pairing with the database and is
restarted automatically. If the schema DID move, the service is deliberately
left down with a restore instruction — a visible outage is the correct state,
and a site that looks up while corrupting rows is not.

### First install

An empty database has nothing to back up, and that is detected explicitly.
"Empty" means **provably** empty: tables, views, materialised views, sequences,
functions, custom types and non-`public` schemas are all counted. Anything
present without a `payload_migrations` ledger is refused, because applying
migrations onto unknown pre-existing state can destroy data.

Provisioning runs `deploy.sh` directly as root, because the SSH entrypoint
accepts immutable digests only and a first install is normally driven from a
human-supplied tag.

---

## 4. When a deploy fails

The script distinguishes the cases, and they need different responses.

| Failure | State | What to do |
|---|---|---|
| Dirty-database refusal | Nothing changed | Investigate the database by hand. Do not force past it |
| Pre-cutover backup failed | Previous release restored to service | Usually disk space. Fix and re-run |
| Candidate failed, **schema unchanged** | Previous release restarted automatically; window closed | Nothing to recover. Fix the release |
| Candidate failed **after applying migrations** | **Nothing is serving, deliberately** — the old build predates the schema | `restore.sh`, which restores the database *and* the paired image |
| First install failed | Nothing was serving before, still isn't | Fix config and re-run. There is no backup to restore |
| Promotion failed, **schema unchanged** | Previous release restarted automatically; window closed. The release-state file is deliberately **not** advanced | Usually something else bound to `127.0.0.1:3000`. Check what, then re-run |
| Promotion failed **after migrations** | **Nothing is serving, deliberately.** The failed image is stopped and proven stopped before the ledger is read; the previous build predates the schema and is never started; the new image had one bounded retry and is then left stopped rather than crash-looped; the release-state file is **not** advanced | `restore.sh`, which restores the database *and* the paired image |

There is deliberately **no** "left running and recovering" outcome for a
schema-moved promotion failure. The image was healthy as a candidate against
this exact database and already got one bounded retry on the stable port; if
that failed too, restarting it and letting `restart: unless-stopped` keep trying
is not a recovery strategy — it is an unhealthy container crash-looping on a
port it cannot serve. So it is left stopped, and recovery is a deliberate
`restore.sh`.

The migration ledger is only read **after** the failed candidate — or the
failed promotion — has been
stopped and proven stopped. Reading it while a candidate is still crash-looping
would be a time-of-check/time-of-use race: it could apply another migration
between the read and the decision.

**If the ledger cannot be read at all, that is not "unchanged".** A failed
ledger query (the database is unreachable, or the query errors) leaves the
schema state UNKNOWN, and UNKNOWN is treated exactly like "schema moved": the
previous image is **not** restarted (doing so against a possibly-migrated schema
is the corruption case), nothing is served, the release-state file is not
advanced, and recovery is a deliberate `restore.sh`. A missing
`payload_migrations` table is *not* an unreadable ledger — it is a known-empty
one (rc 0), which classifies as a first install; only a genuine query failure is
UNKNOWN.

### Why image rollback is not database rollback

Restarting the previous image is safe **only** if the schema did not move. If
the ledger changed, the old build does not understand the current schema, and
starting it is how a failed deploy becomes data corruption. The script refuses
and points at `restore.sh`, which restores the database **and** the application
image recorded with that backup.

---

## 5. Backup and restore

### What a backup is

`backup.sh` produces a verified restore point:

- a `pg_dump` in custom format, proven readable by `pg_restore --list`;
- an uploads archive, fully decompressed and read end to end — `tar --test` is
  **not** used, because it seeks past data blocks and passes on truncated
  archives (measured);
- `metadata.json` recording the exact application image and revision;
- `MANIFEST` and `SHA256SUMS`;
- `umask 077`, asserted `0700` directory and `0600` files. A backup is every
  row of the database, including password hashes.

A quiesced backup stops the app so the dump and the uploads describe one
instant, and an EXIT trap returns it to service on **every** path — success,
failure or interruption. A standalone backup can never leave the site down.

### What a backup is NOT

**A Docker volume is not a backup. A copy on the same disk is not a backup.**

`PENDING REAL VPS`, and non-negotiable before production:

1. a current copy leaves the host;
2. a restore has been performed **from that off-host copy** at least once.

### Restoring

`restore.sh` does everything that can fail **before** anything is destroyed:

```
verify MANIFEST + SHA256SUMS + metadata
  -> refuse a cross-environment or cross-database restore (exact repo + db id)
  -> prove the dump is readable (pg_restore --list)
  -> obtain the paired application image
  -> freeze writes: stop every writer, ALTER ROLE app NOLOGIN, terminate
     sessions, then PROVE a fresh TCP login as the app role is REFUSED
  -> extract the uploads to a STAGING tree, with a space preflight
  -> [ DROP SCHEMA; pg_restore; swap uploads ]   <- the only destructive part
  -> re-enable LOGIN, prove the app can connect again, start + record the image
```

The write freeze is a **login barrier**, not a `REVOKE CONNECT`. `REVOKE CONNECT
... FROM <app role>` does not actually stop the application reconnecting:
PostgreSQL grants `CONNECT` to `PUBLIC` by default and every role inherits
`PUBLIC`, so the revoke leaves the effective privilege intact (verified against
the pinned image). `ALTER ROLE ... NOLOGIN` is the barrier PostgreSQL documents
— a role that cannot log in cannot open the initial connection regardless of
`PUBLIC` grants or `pg_hba` — and the restore PROVES it by attempting a real TCP
login as the app role and requiring the "not permitted to log in" rejection
before it drops the schema. `LOGIN` is restored through an EXIT trap so a failed
restore can never leave the application locked out of its own database. "Every
writer" is app-prod, any app-candidate from an interrupted deploy, and one-off
Seed containers — defined once in `deploy/scripts/lib/writers.sh` and shared by
backup and restore.

A backup missing `MANIFEST`, `SHA256SUMS` or `metadata.json` is **refused**. It
can still be restored, but only as a deliberate act:

```
ALLOW_UNVERIFIED_BACKUP=I-ACCEPT-POSSIBLE-DATA-LOSS deploy/scripts/restore.sh <dir>
```

Take a fresh verified backup of the current state first.

### Retention: backups and images are one contract

`restore.sh` starts the image recorded in the backup's metadata. **A retained
backup whose paired image has been pruned is not a restore point.** Image
retention must therefore be at least as long as backup retention.

Never run `docker system prune --volumes` on this host — it would destroy the
database and the uploads. Retire images deliberately, after confirming no
retained backup names them.

Backups taken before the repository moved to `aau-university/aau-platform`
record images in the old `ghcr.io/mohammed7779948484-tech/…` packages. They stay
restorable — with exactly their recorded digest, never a rebuild — under the
rules in [GHCR_CHANNEL_MIGRATION.md](GHCR_CHANNEL_MIGRATION.md), which also
lists what must be copied before the old credentials are revoked.

---

## 6. No content Seed

The broad content Seed and the one-time Neon import tooling were removed from this repository. Staging and Production keep their data on the server and are recovered only from verified backups (`deploy/scripts/restore.sh`, `deploy/scripts/initialize-from-backup.sh`); nothing re-seeds or re-imports an environment.

The minimal identity bootstrap (missing canonical Roles + the configured Super Admin, automatically on every start, never rewriting content) is unchanged.

---

## 7. Retiring the bootstrap password

`INITIAL_ADMIN_PASSWORD` is needed only until the Super Admin exists.
**Deleting the line is not enough** — the running container keeps the
environment it was created with.

> **Production normally never needs it at all.** An environment founded from a
> platform backup already contains the university's real users, including the
> real Super Admin. Point `INITIAL_ADMIN_EMAIL` at that account and leave
> `INITIAL_ADMIN_PASSWORD` unset: the bootstrap validates the existing account
> instead of creating one, and no migrated password is ever replaced.
> `initialize-from-backup.sh` refuses when the configured address is absent from
> the restored dataset, so this is caught before anything is deployed.

```
# 1. remove the line from /srv/aau/production/deploy/.env.production
# 2. recreate on the SAME known-good digest
deploy/scripts/compose.sh up --detach --force-recreate app-prod
# 3. verify
curl -sf https://<origin>/api/health
docker inspect <container> --format '{{json .Config.Env}}' | grep -c INITIAL_ADMIN_PASSWORD   # -> 0
# 4. confirm admin login still works
```

The bootstrap never resets an existing Super Admin's password, so after
retirement it validates the account and does nothing else.

---

## 8. Secrets

The env file is root-owned `0600` and is the only place real secrets live on
the host.

**Single-quote every value.** `docker compose --env-file` interpolates `$`,
truncates at an unquoted ` #`, and processes escapes inside double quotes —
only single quotes are literal. A value must not contain a single quote.

```
openssl rand -base64 48 | tr -d "'\n"
```

The deploy scripts read this file with `read-env.sh`, which reproduces exactly
those rules and **refuses** any line whose meaning would depend on
interpolation, rather than silently disagreeing with the parser that configures
the containers. It never `source`s the file: `source` would *execute* a
password containing `$(...)` or backticks.

The application password appears **once**. The application assembles and
percent-encodes its own connection URI from the discrete `APP_DB_*` values, so
a password containing `@`, `:`, `/`, `?`, `#` or `%` needs no hand-encoding and
cannot drift between copies.

`tests/deploy/env-contract-drill.sh` re-measures all of this against real
Compose on every CI run.

---

## 9. Networking — precise claims only

`internal: true` removes the default gateway from the `backend` network.

**It does mean:** containers on it have no ordinary route to anything outside
it, and nothing outside the Docker network stack routes in.

**It does not mean** the services are isolated from the Docker **host**. The
host owns the bridge and can reach container IPs directly; anything running as
root there can reach them regardless. The host is a privileged trust boundary,
not something Docker networking defends against.

That is exactly why PostgreSQL and Redis both require authentication here. The
Redis password is written into a private config file inside the container
rather than passed as `--requirepass`, because `/proc/<pid>/cmdline` is
world-readable and this host also serves other cPanel accounts.

**Public exposure is a firewall question and must be verified from outside the
host.** `PENDING REAL VPS` — see STAGING_VPS_CONTRACT.md §13.

---

## 10. Reverse proxy

The real host uses **cPanel-managed Apache**. Use
[`reverse-proxy/apache-cpanel.conf.example`](./reverse-proxy/apache-cpanel.conf.example).

Never edit cPanel-generated `httpd.conf` — it is regenerated on account
changes, SSL renewals and EasyApache updates. Use the per-user, per-domain
userdata include directories.

The rule must capture **one vhost**, and must not capture `mail.*`,
`webmail.*`, `cpanel.*`, `whm.*`, `autodiscover.*`, `autoconfig.*`,
`cpcalendars.*`, `cpcontacts.*` or `/.well-known/acme-challenge` — breaking the
last one breaks AutoSSL renewal and takes the site down later in a way that
looks like an application fault.

`reverse-proxy/nginx.conf.example` is retained as a generic reference and is
what the CI proxy simulation exercises. It is **not** the real-host target.

---

## 11. Health, logs, monitoring

`/api/health` initializes Payload, performs a real PostgreSQL read, and returns
**503** if the identity bootstrap failed. Payload swallows errors thrown from
`onInit` (measured), so a database that answers queries is not on its own
evidence that a release is ready to serve — the bootstrap runner records the
failure and terminates the process.

Logs use Docker's `local` driver, which rotates and compresses (20 MB × 5).

Migration startup time drives the healthcheck `start_period` (120s). Re-measure
when a release adds a long or locking migration; that is also the signal to
reconsider a separate migration runner for that release.

---

## 12. Recovery

- **Host reboot** — `restart: unless-stopped` brings production back. The
  candidate service is `restart: 'no'` on purpose, so a failed candidate never
  survives a reboot. `PENDING REAL VPS`: prove the whole stack returns
  unattended, in order, with the proxy working.
- **Lost host** — recovery needs the off-host backup **and** the paired image.
  Both, or neither works.
- **Stuck operation lock** — read `<lock>.status` for the operation and PID.
  The lock is held until the holder *and* every child that inherited its
  descriptor exits, which is correct: those children are the in-flight work.

---

## 12a. Who may release production, and what happens when that blocks you

Three designs were available for authorising a production release. This is the
one chosen, and the operability cost that came with it.

**Option A — lineage containment only.** Require the resolved SHA to be an
ancestor of `PRODUCTION_RELEASE_REF`. Cheap and automatic, but it authorises a
*commit*, not a *person*: anyone able to push to that branch can release, and a
compromised CI token that can push can also release.

**Option B — approval only.** Drop the lineage check and rely on the `production`
GitHub Environment's required reviewers. Authorises a person, but any SHA in the
repository becomes deployable — including one from an unmerged branch that
passed no review. "Production" then means "whatever a reviewer happened to
approve at 2am".

**Option C — both, plus a typed confirmation.** What is implemented.
A release must be *contained in* `PRODUCTION_RELEASE_REF` (the commit is on the
approved lineage), *and* pass the `production` Environment gate (a human
approves the run), *and* carry the typed confirmation input (the operator states
intent explicitly rather than clicking through). The three are independent: a
pushed commit is not a release, an approval does not bless an arbitrary SHA, and
neither happens by muscle memory.

### The operability cost, stated plainly

Fail-closed means genuinely closed. **If `PRODUCTION_RELEASE_REF` is unset or
misspelled, no production deployment can run at all** — including an emergency
one. That is deliberate: a gate that opens when it cannot verify its own policy
is not a gate. The workflow names the missing variable in its error, and the fix
is a repository-settings change by an owner, which is exactly the level of
authority that should be required to change what "production" means.

There is no break-glass bypass, and none should be added. The emergency path is
the ordinary path: push the hotfix to the release branch, which is what
`PRODUCTION_RELEASE_REF` names. The branch is writable; the gate is not asking
for anything that a real incident cannot satisfy in a minute. A "skip the check
just this once" input would be permanently available to anyone who can start the
workflow, which is precisely the population the check exists to constrain.

What this does **not** defend against, and should not be claimed to: an
attacker who can both push to the release lineage and obtain an Environment
approval. That is an account-compromise problem, answered by branch protection
and by who holds reviewer rights — not by anything in this repository.

### The production digest allow-list is the consumer-side half

The gates above run in GitHub, on the build side. There is a second, independent
control on the VPS itself, enforced by the root-owned `deploy-entrypoint.sh`
against a root-owned policy file the deploy account cannot write. It matters
because a *stolen deploy credential* should not be able to deploy any historical
digest that happens to exist in the approved GHCR package.

This is why preparing a release and deploying it are **two workflows**. A digest
cannot be recorded in the allow-list before it exists, so a single workflow that
built and then immediately cut over would be refused by the host — and the only
way to retry is to run it again, which REBUILDS. The image is not
bit-reproducible (base-image updates, `apt-get upgrade`, timestamps), so the
retry produces a *different* digest, which is again not on the list. The loop
never terminates.

The production flow:

```
Prepare production release            (.github/workflows/release-production.yml)
  -> lineage containment + release gate + production Environment + typed PUBLISH
  -> build & publish the immutable production digest, ONCE
  -> the job summary prints the exact digest and the line to record
     (nothing has been deployed)

  -> an operator records that digest in the root-owned
     /srv/aau/production/deploy/authorized-releases

Deploy production release             (.github/workflows/deploy-production.yml)
  -> pulls that exact digest from the PRODUCTION package (never builds)
  -> reads the commit out of the artifact's own revision label and checks THAT
     against the release lineage, so the commit authorized is the one that
     actually built the image
  -> production Environment approval + typed DEPLOY
  -> the forced command / entrypoint deploys ONLY that authorized digest
```

The artifact that was gated, inspected and authorized is byte-for-byte the
artifact that runs. `deploy-production.yml` cannot publish: it never calls
`build-publish.yml`, which is asserted in
`src/__tests__/config/vps-deployment-contract.test.ts`.

`release-policy.conf` selects the mode per environment:
`authorized_digests_file=<path>` for production (only digests an operator has
recorded deploy), and `authorized_digests=any-in-channel` for **staging**, which
is the automatic environment and deliberately accepts any digest in its own
channel (logged loudly on every run). A missing policy file fails closed.

Recording the authorized digest is a **separate** action from deploying it, and
must NOT be automated with the same SSH credential the deploy uses — that would
collapse the authorization and deployment boundaries into one credential. It is
an operator step, by design.

---

## 12b. The first production launch

Production reaches **LOCAL READY** before the domain moves, and **LIVE** after.
The two are separate on purpose: nothing about routing a domain requires
rebuilding or redeploying an application, and treating them as one step would
mean opening a maintenance window to test a DNS record.

```
STEP 1  one-time data initialization        (operator, on the host)
STEP 2  prepare the production release       (GitHub)
STEP 3  record the digest in the allow-list  (operator, on the host)
STEP 4  deploy -> PRODUCTION LOCAL READY     (GitHub)
STEP 5  DNS / Apache / TLS / firewall        (operator, on the host)
STEP 6  verify -> PRODUCTION LIVE            (GitHub, changes nothing)
```

### Step 1 — the dataset, once

Production's first dataset is the **accepted migrated one**, not a re-run of the
conversion. The lineage is:

```
frozen Neon -> corrected migration on STAGING -> accepted staging
  -> final verified staging platform backup -> production
```

The Neon import that produced the accepted Staging dataset is complete and its
tooling has been removed. Production restores an already-correct schema instead:

```
# on the production host, as root, against a VIRGIN environment
AAU_ENV=production \
ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
  deploy/scripts/initialize-from-backup.sh /path/to/<verified-backup>
```

It verifies the artifact completely before touching anything (manifest,
checksums, a readable dump, a fully-read uploads archive) and **has no
unverified opt-in** — `restore.sh` has one because during an outage an
unverifiable backup can still be the least-bad option; a planned initialization
has no clock on it. A `live` backup is refused as a baseline: its dump and its
uploads describe two different instants, so a document could reference media the
archive does not contain.

It then **proves the target is virgin** — no release-state file, no application
container even stopped, no migration ledger, zero user-created objects, no
stored uploads — and refuses otherwise. The receipt it writes afterwards is for
auditing only: delete it and a second run still refuses, because the guard is
the database and the filesystem, not a marker.

Every restored object is given to the application role (`--no-owner --role`),
and that ownership is **asserted, not assumed**. This is the staging migration's
defect prevented rather than repeated: objects owned by the admin role are
invisible in every schema count and surface later as a blank Admin panel with
SQLSTATE 42501.

It never seeds, never replaces a migrated password, and never writes a
release-state file — nothing has been deployed yet.

### Steps 2–4 — the release, and LOCAL READY

Steps 2 and 3 are §12a. Step 4 runs **Deploy production release**.

The first deployment lands on a database that already has data, uploads and a
migration ledger, but has never had a release. That is neither an empty fresh
install nor a normal redeploy, and `deploy.sh` treats it correctly: an existing
installation, so it takes a verified pre-cutover backup of the imported dataset
*before* changing anything, then runs the usual candidate → migrations →
identity validation → health → promotion sequence.

The identity bootstrap **validates** the migrated Super Admin rather than
creating one, provided `INITIAL_ADMIN_EMAIL` names an account the dataset
carries. Step 1 refuses when it does not, so this cannot be discovered at
cutover.

The public HTTPS probe is **skipped**, not failed, while
`PRODUCTION_PUBLIC_READY` is unset, and the run reports that plainly. What
proves LOCAL READY is the cutover itself: `deploy.sh` promotes onto
`127.0.0.1:3000` only after the candidate has passed `/api/health`, which
initializes Payload, reads PostgreSQL and answers 503 if the bootstrap failed.
No extra capability on the host is needed to observe it, and none is granted.

#### If that first deployment fails — baseline recovery

The first deployment is the one case where a failure cannot be recovered the
normal way, so it has its own documented path.

A normal rollback restores the database **and** restarts the application build
recorded with the backup. The pre-cutover backup taken during the *first*
deployment records no application image, because none exists: the database was
founded by `initialize-from-backup.sh`, and no release has ever been deployed
here. There is nothing to pair the restored schema with.

Substituting the incoming release would be wrong twice over. It is the build
whose migrations just ran and whose health gate just failed, so pairing it with
the *pre-migration* schema pairs a build with a database it has already been
shown not to work against — and `restore.sh` writes whatever it started into the
release-state file as this environment's release identity.

So `restore.sh` recognises this state and performs a **baseline recovery**:

```
deploy/scripts/restore.sh /srv/aau/production/backups/<pre-cutover-backup>
```

with **no** `RESTORE_IMAGE`. It restores the database and the uploads, starts
nothing, and writes no release-state file, returning production to exactly the
state `initialize-from-backup.sh` left it in: the accepted dataset, with no
release deployed. Then fix whatever the candidate logs show and re-run the same
first deployment.

It is entered only when the system's own state agrees that nothing was ever
released here — all four of:

| condition | why it matters |
| --- | --- |
| the backup records no application image | there is nothing to pair with |
| no `RESTORE_IMAGE` was supplied | the operator is not naming one |
| no release-state file exists | no release was ever promoted |
| no `app-prod` container exists at all | not merely stopped — never created |

If a release-state file *does* exist, this is not a virgin environment: a backup
with no recorded image is then a bookkeeping failure rather than a baseline, and
`restore.sh` still refuses until an image is named. An unreadable `docker ps` is
treated as "a release exists", never as virgin.

What baseline recovery is **not**: it does not re-import from Neon (that path is
staging-only and structurally unreachable from production), it runs no Seed, and
it invents no release identity. It is the same accepted dataset, restored from
the backup taken minutes earlier by the deployment that failed.

`tests/docker/first-install-and-recovery-drill.sh` Phase 8 runs this end to end
against real containers: it founds an environment from a verified backup, fails
a first deployment *after* it has applied a migration, recovers, and then proves
the recovered baseline still deploys — checking the migration ledger, the user
count, the role set, content rows, the uploads tree, the absence of a
release-state file, that no candidate is left running, and that the stable port
is honestly down rather than falsely healthy.

### Steps 5–6 — LIVE

Step 5 is host-side and changes nothing about the application: DNS, the
cPanel/Apache vhost forwarding `https://aau.edu.ye` to `127.0.0.1:3000`, TLS,
and the firewall. The image was built for that canonical origin all along —
`NEXT_PUBLIC_SERVER_URL` is inlined by `next build`, so a localhost-origin
image would have had to be rebuilt here, which is exactly what this avoids.

Step 6 runs **Verify production public origin**
(`.github/workflows/verify-production-public.yml`). It curls `/api/health` and
`/`, and does nothing else: no build, no host access, no maintenance window.
When it passes, set `PRODUCTION_PUBLIC_READY=true` and every later deployment
includes the public probe in its own gate again. The same workflow then doubles
as a daily uptime canary.

> If the public origin does not answer, **do not redeploy**. Redeploying opens a
> maintenance window and moves the database; it cannot change a DNS record.

---

## 13. Remaining `PENDING REAL VPS`

The full list, with the 15 required drills, is in
[STAGING_VPS_CONTRACT.md §15](./STAGING_VPS_CONTRACT.md#15-required-real-host-drills).
The ones that block a production release:

- [ ] Off-host backup copy exists, and a restore **from it** has been performed
- [ ] External port scan confirms 3000/3001/13000/13001/5432/6379 are closed
- [ ] Reboot drill
- [ ] Apache include survives a cPanel rebuild
- [ ] cPanel/mail/MariaDB non-regression after every change
- [ ] Resource measurement under load (the host has **no swap**)

Production-specific, and not yet performed by anyone (see §12b):

- [ ] The one-time data initialization has been run against the real production
      environment from the final verified staging platform backup
- [ ] The first production release has reached **LOCAL READY** on
      `127.0.0.1:3000`
- [ ] DNS, the Apache vhost, TLS and the firewall have been cut over
- [ ] **Verify production public origin** has passed and
      `PRODUCTION_PUBLIC_READY=true` has been set

Nothing in this repository has performed any of those, and nothing here claims
production has been deployed.
