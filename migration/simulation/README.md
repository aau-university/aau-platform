# Real Neon → VPS Migration Simulation — Public Media Scope

This directory contains the reproducible migration rehearsal for the AAU Payload platform, based on the real Neon `production` data and final VPS code at commit `474728e9045e3a0bdee1e3601d0ba4b7a49b7b1e`.

## Scope decision

**Private Media is intentionally excluded from file migration.** Those uploads were experimental and are not required for the production cutover.

- Existing `private_media` database rows are preserved as historical data.
- No private binary is downloaded.
- No `uploads/private` archive is required.
- Private-media file availability is not a cutover gate.
- Public `media` remains fully in scope.

## Database rehearsal

The migration was executed against a real Neon copy-on-write branch created from `production`, with a separate Golden PostgreSQL 18 schema built from the final Payload migrations.

Observed final target:

- 346 public tables
- 2584 logical columns
- 113 enums
- 1981 constraints
- 1285 indexes
- 280 sequences
- logical columns by name/type/default/nullability: MATCH
- enums: MATCH
- constraints: MATCH
- indexes: MATCH
- sequences: MATCH

Data-preservation verification across all source tables that remain in the target showed no unintended row-count loss. Deep content hashing found only the intentional migration-ledger difference after excluding deliberate publication-status and public-media URL transformations.

## Repeatability

The committed `01_upgrade_working_copy.sql` was run again against a second fresh Neon copy of `production`.

Result:

- safety assertions: PASS
- stage 1: PASS
- stage 2: PASS
- stage 3: PASS
- stage 4: PASS

This proves that the committed migration script is reproducible against the captured source state rather than depending on the first interactive migration session.

## Public Media

Exact public-media inventory from the real database:

- Public originals: 123
- Generated public variants: 496
- Total public objects: **619**
- Expected total bytes: **62,447,631 bytes**
- Unknown file sizes: 0

`03_public_media_manifest.csv` contains the exact source URL, target path, variant, media ID, and expected byte size for every required public R2 object.

Target layout:

```text
uploads/
└── media/
    ├── original files
    └── generated image variants
```

Public database URLs are normalized from the R2 public origin to Payload local routes:

```text
https://<r2-public-host>/media/<encoded-name>
        ↓
/api/media/file/<encoded-name>
```

## Files

- `00_preflight.sql` — read-only source checks.
- `01_upgrade_working_copy.sql` — one-time source → final schema/data upgrade. **Never run directly on Neon production.**
- `02_verify.sql` — post-migration database verification.
- `03_public_media_manifest.csv` — 619 real public-media objects only.
- `04_fetch_public_media.mjs` — downloads the public objects into `uploads/media`, verifies byte sizes, and emits SHA-256 checksums.

## Public Media rehearsal result

The real public R2 export was executed in GitHub Actions against the committed manifest.

Result:

- 619 / 619 public objects downloaded: PASS
- expected byte-size validation for every object: PASS
- SHA-256 checksum GENERATED for every downloaded object (the manifest carries expected byte sizes, which are compared; it carries no trusted per-object hashes, so these checksums detect later change rather than prove the bytes matched a source value)
- `public-media.tar.gz` created successfully
- archive size: **59,321,661 bytes**
- archive SHA-256: `86e278f19f2bb371adadc8ed1c55fdfcdeddbdb7aff1db1e637c8afef4adf424`
- GitHub Actions artifact: `aau-public-media-rehearsal` (short-lived rehearsal artifact)

No Private Media binary was fetched.

## Final public-only rehearsal result

A fresh third Neon copy of `production` was used after the private-media exclusion change. The final committed public-only migration script passed:

- safety assertions: PASS
- stage 1: PASS (129 statements)
- stage 2: PASS (248 statements)
- stage 3: PASS (255 statements)
- stage 4: PASS (2 statements)

The migrated working schema then matched the Golden Reference on every measured structural invariant:

- tables: MATCH (346)
- logical columns: MATCH (2584)
- column schema hash: MATCH
- enums: MATCH (113)
- enum hash: MATCH
- constraints: MATCH (1981)
- constraint hash: MATCH
- indexes: MATCH (1285)
- index hash: MATCH
- sequences: MATCH (280)
- sequence hash: MATCH

Deep data-content verification compared all 304 source tables that remain in the final schema. Public-media URL fields were excluded because their R2 → local conversion is deliberate. Private Media fields were **not excluded** and therefore were verified unchanged.

Result: **303 / 304 table content hashes matched exactly**. The only difference was `payload_migrations`, intentionally changed from 0 rows to the 2 adopted final migration records.

## Remaining production-equivalent gates

A real PostgreSQL `pg_dump -Fc` / restore cycle still requires a trusted environment with PostgreSQL 18 client access to the direct Neon endpoint. Database credentials are deliberately not committed to GitHub.

The full target rehearsal is:

```text
Neon production
    ↓ real pg_dump -Fc
fresh PostgreSQL restore
    ↓
00_preflight.sql
    ↓
01_upgrade_working_copy.sql
    ↓
02_verify.sql
    ↓
download + verify 619 Public R2 objects
    ↓
uploads/media
    ↓
final Docker image
    ↓
application / browser / backup / restore gates
```

Private binary files are intentionally outside this flow.
