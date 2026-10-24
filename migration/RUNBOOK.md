# Neon → Staging VPS migration rehearsal — runbook

The exact procedure for a **real** migration rehearsal against the existing
Staging VPS. It is staging-only: there is no variable, flag or acknowledgement
in this tooling that runs it against production.

Read [`README.md`](./README.md) for the scope table first. In short: Public
Media rows **and** binaries migrate, public R2 URLs become local Payload media
URLs, Private Media rows are preserved unchanged, and Private Media binaries
are intentionally **not** migrated.

---

## 0. Preconditions

| Requirement | Why |
| --- | --- |
| Shell on the Staging VPS as root (or with passwordless `sudo`) | The uploads tree must end up owned by UID:GID `10001:10001`, the runner image's runtime identity. |
| `AAU_ENV=staging` on **every** command | `deploy/scripts/lib/environment.sh` defaults to `production`; the import refuses that, but do not rely on the refusal. |
| A staging release already deployed (`/srv/aau/staging/deploy/deployed-image`) | The migrated schema is the FINAL schema and must be paired with a build that speaks it. The import uses **only** that recorded release and has no override; it must be an immutable digest in the staging package, `ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging@sha256:<64 hex>`. A mutable tag, a local image, the production package or a third-party package is refused. |
| Docker, and outbound HTTPS to the Neon direct endpoint and to the R2 public origin | The export and the media download. |
| The **direct** (non-pooled) Neon connection URL | `pg_dump` against a connection pooler is not a supported combination. |
| ~1 GB free on `/srv/aau/staging` | The dump, the media tree, and the staged copy alongside the live one. |

Nothing in this runbook writes to Neon. Every statement issued against the
source is a `SELECT` or a `pg_dump`.

---

## 1. Take a pre-import backup

```bash
AAU_ENV=staging deploy/scripts/backup.sh
```

The import refuses to run when `/srv/aau/staging/backups` holds no backup. On a
staging host that has never held real content, say so explicitly instead:

```bash
NEON_IMPORT_ALLOW_NO_BACKUP=I-ACCEPT-NO-PRE-IMPORT-BACKUP ...
```

## 2. Export the frozen Neon source

```bash
export NEON_DATABASE_URL='postgresql://…@…neon.tech/neondb?sslmode=require'   # direct endpoint
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

migration/scripts/neon-export.sh /srv/aau/staging/neon-export/"$STAMP"
unset NEON_DATABASE_URL
```

What it does, in order: asserts the frozen source contract against the **live**
source (read-only) and refuses to dump if it no longer matches; runs a real
`pg_dump --format=custom --schema=public --no-owner --no-privileges` using the
same digest-pinned PostgreSQL 18 image the VPS runs; proves the archive is
readable with `pg_restore --list`; writes `MANIFEST`, `SHA256SUMS` and
`metadata.json` (which records the dump's own SHA-256, the freeze date and the
`pg_dump` version).

**Expected:** a non-empty `neon.dump`, a printed SHA-256, and no contract
differences. A `MISMATCH`/`MISSING` line means **stop** — see §7.

## 3. Download and verify the Public Media

```bash
node migration/simulation/04_fetch_public_media.mjs /srv/aau/staging/public-media
migration/scripts/verify-public-media.sh /srv/aau/staging/public-media
```

**Expected:** `619` objects, `62447631` bytes, every SHA-256 matching, and no
`uploads/private` directory. The downloader validates each object's byte size
as it fetches; the verifier re-checks content, count, total size and the
absence of anything extra — the failure that matters is the tree changing
*between* the download and the import.

## 4. Import into Staging

```bash
AAU_ENV=staging \
ALLOW_NEON_IMPORT=I-UNDERSTAND-THIS-REPLACES-STAGING-CONTENT \
  migration/scripts/neon-import.sh \
    /srv/aau/staging/neon-export/"$STAMP" \
    /srv/aau/staging/public-media
```

The import is **build-then-promote**. The entire migration happens in a scratch
database alongside the live one, and is promoted with two `ALTER DATABASE …
RENAME`s only after everything has passed:

| Phase | Step | Staging state |
| --- | --- | --- |
| 0 | staging-only guard, acknowledgement, operation lock | untouched |
| 1 | export MANIFEST / SHA256SUMS / metadata / recorded-hash verification | untouched |
| 2 | Public Media tree verification | untouched |
| 3 | staging-channel image resolved and pulled, pre-import backup checked, `pg_restore --list` | untouched |
| 4 | scratch DB created from `template0` (encoding/collation verified against the live DB) → default `public` schema dropped → **`pg_restore --exit-on-error`** → AAU privilege contract reapplied → **`00_preflight.sql`** + fail-closed source contract → **`01_upgrade_working_copy.sql` run as `APP_DB_USER`** → fail-closed **application-ownership** gate → **`02_verify.sql`** + fail-closed target contract → **canonical version backfill** → fail-closed **canonical-version** gate | untouched |
| 5 | writers frozen, app role set `NOLOGIN`, freeze **proved** by a real TCP login attempt, sessions drained, uploads staged and `chown`ed to `10001:10001` | untouched |
| 6 | **promotion**: live DB renamed aside, scratch renamed into place, uploads swapped | replaced |
| 7 | `LOGIN` restored and proved, `app-prod` started, release state recorded | live |

Any failure before phase 6 leaves staging exactly as it was and drops the
scratch database.

### If the promotion itself fails

The two renames are issued and checked separately, and the window between them
is handled explicitly:

| What failed | What the import does | What you get |
| --- | --- | --- |
| the first rename (`live` → `previous`) | nothing had changed; aborts | staging untouched, scratch dropped |
| the second rename (`scratch` → `live`) | **rolls the original name back automatically**, then aborts | staging untouched, scratch dropped |
| the second rename **and** the rollback | aborts, deletes nothing | both databases retained; rename exactly one to the live name by hand, following the printed instructions |

The migrated database is never dropped while no database carries the live name —
that is enforced by the recorded promotion state *and* a direct catalog check.
The `LOGIN` barrier is lifted against the `postgres` maintenance database, so it
is restored even if the application database was mid-rename when the failure
happened.

**Expected on success:** the closing block naming the migrated database, the
retained pre-import database `<db>_pre_neon_<stamp>`, the retained uploads tree
`…/uploads.pre-neon.<stamp>`, `619` public objects, the preserved
`private_media` row count, and the rollback commands.

## 5. Verify the rehearsal

```bash
curl -fsS http://127.0.0.1:13000/api/health
```

Then, in a browser through the staging vhost:

1. Admin login works.
2. Public pages render images, and their `src` is `/api/media/file/…` — no
   `r2.dev` URL anywhere in the served HTML.
3. Representative real content is present (colleges, programs, faculty, study
   plans) with the counts the import printed.
4. Private Media **rows** are listed in the admin. Their **files** are absent by
   design — that is the documented scope, not a defect.

Then prove the canonical recovery path still works on the migrated content:

```bash
AAU_ENV=staging deploy/scripts/backup.sh
AAU_ENV=staging deploy/scripts/restore.sh /srv/aau/staging/backups/<new-timestamp>
```

## 6. Rollback

**Fast** — while the pre-import database still exists (the import prints these
commands with the real names filled in):

Run it as one fail-fast block, not as loose lines. Each step is checked, the
database rename is undone if its second half fails, and the live uploads tree is
never deleted before its replacement is in place:

```bash
bash <<'ROLLBACK'
set -euo pipefail

DB=<db>
STAMP=<stamp>
ADMIN=<POSTGRES_ADMIN_USER>
UPLOADS=/srv/aau/staging/uploads

psql_admin() {
  docker compose -p aau-staging exec -T postgres-prod \
    psql -U "$ADMIN" -d postgres -v ON_ERROR_STOP=1 -c "$1"
}

AAU_ENV=staging deploy/scripts/compose.sh stop app-prod

# Two separate statements, because the second failing after the first
# succeeded leaves NO database named "$DB" — an outage, not a rollback.
psql_admin "ALTER DATABASE \"${DB}\" RENAME TO \"${DB}_neon_${STAMP}\""
if ! psql_admin "ALTER DATABASE \"${DB}_pre_neon_${STAMP}\" RENAME TO \"${DB}\""; then
  echo "second rename failed; putting ${DB} back" >&2
  psql_admin "ALTER DATABASE \"${DB}_neon_${STAMP}\" RENAME TO \"${DB}\""
  echo "the database is back as it was; the rollback did NOT complete" >&2
  exit 1
fi

# Reversible moves. `rm -rf "$UPLOADS"` first would destroy the live tree
# before knowing the replacement could take its place.
mv "$UPLOADS" "${UPLOADS}.neon.${STAMP}"
if ! mv "${UPLOADS}.pre-neon.${STAMP}" "$UPLOADS"; then
  echo "could not move the pre-import uploads into place; restoring the live tree" >&2
  mv "${UPLOADS}.neon.${STAMP}" "$UPLOADS"
  exit 1
fi

AAU_ENV=staging deploy/scripts/compose.sh up --detach --wait app-prod
echo "rolled back. The replaced copies are ${DB}_neon_${STAMP} and ${UPLOADS}.neon.${STAMP}."
ROLLBACK
```

Delete `<db>_neon_<stamp>` and `<uploads>.neon.<stamp>` later, deliberately, once
the rollback has been verified — not as part of the rollback itself.

**Full** — from the pre-import backup, using the canonical path:

```bash
AAU_ENV=staging deploy/scripts/restore.sh /srv/aau/staging/backups/<pre-import-timestamp>
```

Once the rehearsal is accepted, reclaim the retained copies:

```bash
docker compose -p aau-staging exec -T postgres-prod \
  psql -U <POSTGRES_ADMIN_USER> -d postgres -c 'DROP DATABASE "<db>_pre_neon_<stamp>"'
rm -rf /srv/aau/staging/uploads.pre-neon.<stamp>
```

### Why the scratch database is emptied first

The Neon archive contains its own `CREATE SCHEMA public` — `pg_dump` emits that
whenever the schema is owned by a non-bootstrap role, which it is on Neon — and
a freshly created database already has one. The first real rehearsal therefore
stopped at:

```text
ERROR: schema "public" already exists
```

The import now hands `pg_restore` a genuinely empty database (`TEMPLATE
template0`, default `public` dropped) instead of weakening the restore.
`--exit-on-error` stays, and `--clean`/`--if-exists` are deliberately not used:
each would turn "this archive does not apply cleanly" into a warning nobody
reads. Because the archive drops and recreates `public`, and because the export
is taken with `--no-privileges`, the AAU ownership/grant contract is applied
**after** the restore — that step is the only thing that establishes it.

### Why the upgrade runs as the application role

In PostgreSQL the owner of an object is whoever created it. The upgrade was
executed over the **admin** connection, so all 42 tables, 22 enum types and
their sequences came out owned by `aau_admin`, while the application connects as
`aau_app`. Objects restored by `pg_restore` were unaffected, because it is given
`--role aau_app` and issues its own `SET ROLE`.

Nothing in the schema counts changes — same tables, same columns, same indexes,
`02_verify.sql` passes — and the live symptom was ten blank Admin pages
returning HTTP 200, with Payload's `queryDrafts` failing on SQLSTATE `42501`,
`permission denied for table _colleges_v`. `_pages_v` and `_news_v`, which came
out of the Neon archive, kept working.

`migration/scripts/sql/upgrade_prologue.sql` is prepended to the proven upgrade
at invocation, so the upgrade file itself stays byte-identical (it is SHA-256
pinned by `src/__tests__/migration/neon-migration-contract.test.ts`). A list of
`GRANT` statements was rejected as the fix: it is a second, hand-maintained
model of the schema, and it is wrong the day the schema gains an object nobody
remembered to add. `migration/scripts/sql/ownership_contract.sql` then proves
the result against the catalog — every count is "how many objects are wrong", so
a new kind of object cannot pass by being unlisted.

### Why a canonical version backfill runs before promotion

PR #25 gave five collections a draft workflow and five globals an audit history.
Payload writes a version row when a document is **saved**, so migrated content
that predates that change has none — and Payload serves the Admin list view for
a draft-enabled collection through `queryDrafts`, which reads the version table.
Without this step the migrated documents are present in the database and
invisible in the Admin.

The backfill is the compiled one-shot artifact `/app/version-backfill-runner.mjs`
inside the same immutable image staging runs, invoked against the **scratch**
database only, with `PAYLOAD_RUNTIME_MIGRATIONS` and `PAYLOAD_RUNTIME_BOOTSTRAP`
explicitly `false` (the runner refuses to start otherwise). It writes through
Payload's own `saveVersion`, never raw SQL, and skips any document that already
has a version — so it is idempotent and cannot overwrite genuine editorial
history. Pages and News are deliberately **not** backfilled: they already hold
real version histories.

Because the artifact only exists in images built from this change onwards, the
import checks for it in phase 3 and refuses early if the recorded staging
release predates it. The fix is to deploy a current build to staging first.

## 7. When a contract check fails

The scripts print `MISMATCH <label>: expected X, got Y` and stop. That means one
of:

- **the freeze was broken** — content changed in Neon after 2026-09-07;
- **the wrong database was addressed** — a branch, a different project, a pooled
  endpoint;
- **the export and the import disagree** — a different `source_freeze_date`, or
  an archive that changed after it was written.

Do **not** edit `migration/source-contract.env` to make the run pass. The
committed numbers are the evidence from the validated rehearsal, and
`src/__tests__/migration/neon-migration-contract.test.ts` pins them against the
committed manifest. If the source genuinely changed, the migration needs a
fresh rehearsal, not a fresh constant.

## 8. What this rehearsal does not do

- It does not touch production. There is no override.
- It does not migrate Private Media binaries.
- It does not modify Neon.
- It does not perform the production cutover.

### What production does instead

Production never runs this rehearsal. Once the staging result has been accepted,
take a **quiesced** platform backup of staging and hand that to production:

```
# on staging, with the application stopped for the dump
AAU_ENV=staging QUIESCE_APP=true deploy/scripts/backup.sh

# on a VIRGIN production environment, as root
AAU_ENV=production \
ALLOW_FIRST_INSTALL_FROM_BACKUP=I-UNDERSTAND-THIS-INITIALIZES-PRODUCTION \
  deploy/scripts/initialize-from-backup.sh /path/to/<verified-backup>
```

A `live` backup is refused as a baseline: its dump and its uploads describe two
different instants, so a document could reference media the archive does not
contain. The full lifecycle — initialization, LOCAL READY, the DNS cutover and
LIVE — is `deploy/README.md` §12b.
