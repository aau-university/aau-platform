# Neon → VPS migration

The one-time migration of the **frozen** Neon `production` data onto the AAU
VPS PostgreSQL 18 stack.

| Path | What it is |
| --- | --- |
| [`RUNBOOK.md`](./RUNBOOK.md) | The procedure. Start here to run a rehearsal. |
| [`source-contract.env`](./source-contract.env) | The frozen 2026-09-07 source contract. Every script fails closed against it. |
| [`simulation/`](./simulation/README.md) | The **proven** artifacts and the rehearsal evidence. Preserved verbatim. |
| `scripts/neon-export.sh` | Real `pg_dump -Fc` of the frozen source, with an integrity envelope. |
| `scripts/neon-import.sh` | The staging-only import: restore, preflight, upgrade, verify, promote. |
| `scripts/verify-public-media.sh` | Independent re-verification of the Public Media tree. |
| `scripts/sql/` | Machine-readable source, target, ownership and canonical-version probes (the human-readable reports stay in `simulation/`). |
| `scripts/sql/upgrade_prologue.sql` | Makes the proven upgrade run as the **application** role, so it owns what it creates. Prepended at invocation; the upgrade file itself stays byte-identical. |

## Scope — explicitly

| Item | In scope | Notes |
| --- | --- | --- |
| Public Media **rows** (`media`, 123) | ✅ | Preserved with their real IDs. |
| Public Media **binaries** (619 objects, 62,447,631 bytes) | ✅ | Downloaded from R2 into `uploads/media`. |
| Public Media **URLs** | ✅ rewritten | `https://<r2-host>/media/<name>` → `/api/media/file/<name>`, in `url` and all eight size/thumbnail columns. |
| Private Media **rows** (`private_media`) | ✅ preserved unchanged | Asserted equal before and after the upgrade. |
| Private Media **binaries** | ❌ **intentionally excluded** | Experimental uploads, not required for cutover. No `uploads/private` is produced, and a tree containing one is **refused**. |
| Everything else in the source schema | ✅ preserved | 303 of 304 shared table content hashes matched exactly in the rehearsal; the one difference is the deliberate migration ledger. |
| Object **ownership** | ✅ | Every migrated table, sequence and enum type is owned by `APP_DB_USER`, gated fail-closed before promotion. |
| Canonical **initial versions** | ✅ created | One version per document for the five collections and five globals PR #25 gave versioning. Pages and News keep their real histories and are not backfilled. |

## Two defects the live 2026-09-14 Staging diagnosis found

Both produced the same symptom — an Admin page returning HTTP 200 with a blank
content area — and neither is visible in any schema count.

| Defect | Cause | Fix |
| --- | --- | --- |
| `permission denied for table _colleges_v` (SQLSTATE `42501`) | The upgrade ran over the **admin** connection, so every object it created was owned by `aau_admin` while the application connects as `aau_app`. Tables restored by `pg_restore` were unaffected — it is given `--role` — which is why `_pages_v` and `_news_v` kept working. | `scripts/sql/upgrade_prologue.sql` runs the upgrade as the application role; `scripts/sql/ownership_contract.sql` proves the outcome against the catalog before promotion. Regression-tested against a real server by `tests/migration/neon-object-ownership-drill.sh`, which is mutation-checked. |
| Empty version tables | PR #25 gave five collections a draft workflow and five globals an audit history. Payload writes a version row when a document is **saved**, so content that predates the change has none — and the Admin list view for a draft-enabled collection is served from the version table. | A one-shot canonical backfill through Payload's own `saveVersion`, run against the scratch database before promotion; `scripts/sql/versions_contract.sql` proves the coverage. Covered by `tests/int/version-backfill.int.spec.ts` and `tests/e2e/admin-content.e2e.spec.ts`. |

## Why there is no sync service

The source has been frozen since **2026-09-07** and no content is being added
before the VPS cutover. So this is a one-time dump, not a pipeline: there is no
CDC, no incremental sync, no dynamic snapshotting and no synchronisation
service — and there must not be, because each would be an unverified moving
part in the most dangerous position available. Instead, the numbers measured
during the validated rehearsal are committed in `source-contract.env`, and
every script **fails closed** when the live source stops matching them. A
mismatch means the freeze was broken or the wrong database was addressed. It is
never a reason to edit the contract.

## Relationship to the VPS deployment

The Neon import is deliberately a **separate entry point** from
`deploy/scripts/restore.sh`. That script is the canonical AAU recovery path: it
restores a backup this platform produced, of this platform's own final schema,
paired with the image that made it. A raw Neon dump is none of those things, so
teaching `restore.sh` to accept one would mean weakening the checks that make
recovery trustworthy, on the path used at 3am.

The two share their libraries — `environment.sh`, `oplock.sh`, `writers.sh`,
`read-env.sh` — and their ordering discipline (everything fallible before
anything destructive). They do not share their entry point, and nothing under
`deploy/` was changed to accommodate this migration.

### How production gets this dataset — it does NOT run this import

This tooling is **staging-only and stays that way**. `neon-import.sh` refuses
production with no override, and the `migration/` tree is not installed on a
production host at all.

Production consumes the *result* of this work, not the machinery:

```
frozen Neon -> corrected migration on STAGING -> accepted staging
  -> final verified staging platform backup   (deploy/scripts/backup.sh)
  -> deploy/scripts/initialize-from-backup.sh -> production
```

That third script is a **third** entry point, deliberately distinct from both of
the above. `restore.sh` recovers an environment that already exists, and refuses
a staging backup against production outright — a refusal this work does not
weaken. `neon-import.sh` converts a source schema. `initialize-from-backup.sh`
restores an already-correct schema into an environment it first proves is
virgin, and refuses everything else. The corrections proven here — object
ownership and the canonical version backfill — travel to production inside the
backup, already applied, and the ownership contract is re-asserted there against
the restored catalog. See `deploy/README.md` §12b.

## Contract re-verification (2026-09-08, read-only)

The committed contract was re-checked against the real Neon project after the
tooling was written, using `scripts/sql/source_contract.sql` and
`scripts/sql/target_contract.sql` unchanged. Read-only; nothing was written.

| Probe | Target | Result |
| --- | --- | --- |
| `source_contract.sql` | the live frozen `production` branch | every asserted value matches: ledger 0, jobs 0, jobs_log 0, duplicate StudyPlans 0, NULL publication flags 0, offer mismatches 0, `media` 123, rows off the frozen R2 origin 0 |
| `target_contract.sql` | the Golden Reference schema | 346 / 2584 / 113 / 1981 / 1285 / 280 — matches `TARGET_*` exactly |
| `target_contract.sql` | the migrated working copy from the proven rehearsal | ledger exactly `20260809_020424_baseline:1,20260815_025241_one_study_plan_per_program:1`; invalid public URLs 0; invalid thumbnails 0; residual absolute R2 URLs 0; duplicate StudyPlans 0 |

Row counts recorded on both sides of the proven migration, unchanged:
`media` 123, `private_media` **12**, users 21, roles 8, colleges 4,
academic_departments 23, academic_programs 23, faculty_members 4,
study_plans 3.

The source is therefore still frozen and still matches the 2026-09-07 capture,
and the post-migration assertions are known to pass on the real migration
output rather than only on paper.
