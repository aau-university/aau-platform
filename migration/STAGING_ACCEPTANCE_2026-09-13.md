# Real Neon → Staging Acceptance — 2026-09-13

This document records the accepted real Staging outcome. It is evidence of the completed rehearsal/migration state, not a request to repeat the migration.

## Verdict

**PASS — REAL FROZEN NEON DATA AND PUBLIC MEDIA ARE ACTIVE ON STAGING.**

Migration window: `2026-09-13T01:08:23Z` → `2026-09-13T01:17:49Z`.

Final operational closeout was recorded as `CHANGE-069` at `2026-09-14T00:15:13Z` with Staging left on the migrated Neon dataset. The old demo Staging state was intentionally **not** restored.

## Repository reconciliation note

The successful run used one operator-authorized verifier correction that was newer than PR #27 at the time of acceptance:

- `migration/simulation/02_verify.sql`
- the five table-specific `_status` enum values are cast to `text` before the `UNION ALL`
- accepted SHA-256: `9ef0790bc13d75b20e36fc2bcd1e90730a3d7f98c2344236718179e422f66381`

Reason: PostgreSQL gives each collection its own enum type, so unioning the raw `_status` enum columns fails even when the textual labels are the same.

## Accepted data state

Before application identity bootstrap, the promoted migrated database contained:

- `users = 21`
- `roles = 8`
- `colleges = 4`
- `academic_departments = 23`
- `academic_programs = 23`
- `faculty_members = 4`
- `study_plans = 3`
- `media = 123`
- `private_media = 12`

The normal application identity bootstrap then created two missing canonical roles only, producing the accepted runtime state `roles = 10` while `users` remained `21`.

## Target contract

The migrated database passed the Golden target contract:

- tables: `346`
- columns: `2584`
- enum types: `113`
- constraints: `1981`
- indexes: `1285`
- sequences: `280`
- duplicate StudyPlans per program: `0`
- invalid Public Media URLs: `0`
- invalid Public Media thumbnails: `0`
- residual R2 Public Media URLs: `0`

Payload migration ledger:

- `20260809_020424_baseline:1`
- `20260815_025241_one_study_plan_per_program:1`

## Public / Private Media scope

Public Media acceptance:

- `619 / 619` objects
- `62,447,631` bytes
- local runtime path: `/srv/aau/staging/uploads/media`
- runtime ownership: `10001:10001`

Private Media behavior is intentional:

- database rows preserved
- private binary files not migrated
- no `/srv/aau/staging/uploads/private` tree is expected

## Application acceptance

Accepted checks included:

- migrated Super Admin login
- Payload Admin dashboard
- real migrated content
- representative original/generated Public Media
- homepage and representative APIs returning HTTP 200
- `https://aauye-edu.net/api/health` healthy
- PostgreSQL, Redis and `app-prod` healthy
- no candidate container left running
- stable app bound to `127.0.0.1:13000`
- PostgreSQL/Redis without host port bindings
- sensitive app/database ports not publicly exposed
- Apache/cPanel/CSF/mail/MariaDB/container runtime non-regression checks passed

## Backup / rollback evidence retained

Final post-acceptance backup:

- `/srv/aau/staging/backups/20260913T011749Z`
- `3727` PostgreSQL archive entries
- `621` uploads archive entries
- SHA256SUMS-file hash: `d4471bdc14b13d1ee5dea43368ec1c6a63f1e86c0c05bb627b02fb0ee4ea7cd5`

Fast rollback/source artifacts retained at closeout included:

- `aau_platform_staging_pre_neon_20260913T010824Z`
- `/srv/aau/staging/uploads.pre-neon.20260913T010824Z`
- `/srv/aau/staging/neon-export/20260910T001114Z`
- `/srv/aau/staging/public-media`

## Current-state rule

Staging is **closed and accepted**. Do not restart the migration from zero, restore the old demo dataset, or broad-seed the migrated data unless a later repository/schema change explicitly invalidates this acceptance and requires a new validation cycle.
