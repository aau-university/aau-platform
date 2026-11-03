# GHCR channel migration — `aau-university/aau-platform`

The source repository moved from `mohammed7779948484-tech/aau-payload-platform`
to the organization repository `aau-university/aau-platform`.
`build-publish.yml` derives the package name from `github.repository`, so every
image built from the new repository is published to a **new** package. The
consumer side (the root-owned host scripts) has to name those packages exactly,
and backups taken before the move must stay restorable.

This document is the contract for both environments. It does not deploy,
publish, copy or authorize anything by itself.

## 1. Channels

| | production | staging |
|---|---|---|
| **Current** (deploy + restore) | `ghcr.io/aau-university/aau-platform` | `ghcr.io/aau-university/aau-platform-staging` |
| **Legacy** (restore of a backup's own recorded build only) | `ghcr.io/mohammed7779948484-tech/aau-payload-platform` | `ghcr.io/mohammed7779948484-tech/aau-payload-platform-staging` |
| Build origin baked into the image | `https://aau.edu.ye` | `https://aauye-edu.net` |

Every match is an **exact string match** of the repository part of an
`image@sha256:<64 hex>` reference. There is no owner wildcard, no prefix or
suffix rule, and no case folding (`build-publish.yml` lower-cases the name
before publishing).

## 2. What the scripts enforce

### `deploy/scripts/deploy-entrypoint.sh` (privilege boundary)

- Accepts only the **current** package of the environment selected by its own
  installed path. Both legacy packages are refused in both environments.
- Digest-only, release policy file and the production allow-list
  (`authorized_digests_file`) are unchanged. An unlisted digest in the right
  channel is still refused in production.
- Consequence at cutover: once the new entrypoint is installed, the OLD
  repository's deploy workflow can no longer deploy (its legacy-channel image is
  refused). Disable it anyway — a refused run is noise, not a control.

### `deploy/scripts/restore.sh` (recovery)

1. A current-channel image: unchanged behaviour (local image, else pull with
   the environment's own `<root>/docker` credential store).
2. A legacy-channel image is accepted **only** when all of these hold:
   - it is the legacy package of the **same** environment;
   - it is digest-pinned;
   - it is **exactly** the `app_image` recorded in this backup's
     `metadata.json` (with or without `RESTORE_IMAGE`; an override naming any
     other legacy digest is refused);
   - therefore never in a cross-environment restore (the recorded image there
     belongs to the other environment).
3. The recorded build is then obtained **by digest**, in this order:
   1. `<current package>@<same digest>` — a digest-preserving copy (see §4).
      If found, it is started and written to `deployed-image` as the
      current-channel reference. Same content address, so same build.
   2. the recorded legacy reference already present on the host;
   3. a pull of the recorded legacy reference through the separate,
      root-only credential store `<root>/docker-legacy`
      (`AAU_LEGACY_DOCKER_CONFIG`), used for that one pull only.
   Each source is re-checked against the image's `RepoDigests`.
4. If none yields that digest, the restore **refuses before starting any data
   service** — nothing is touched.

`backup.sh`, `deploy.sh`, `compose.sh` and the other host scripts are
**unchanged**. `deploy.sh`'s own automatic rollback restarts the previous image
that is already on the host, so the first new-channel cutover can still fall
back to the running legacy build.

### Never done

- `metadata.json` of a retained backup is never edited or relabelled.
- A rebuild is never treated as the recorded build: rebuilds are not
  bit-reproducible (base images, `apt-get upgrade`, timestamps), so they have a
  different digest and are a different release.
- The host cache is never the only recovery path offered.
- Neither package, owner nor environment boundary is widened.

## 3. Intentionally unchanged

- The Neon importer and the content Seed were deleted (not frozen): no repository
  tool can re-seed or re-import an environment.
- Historical acceptance records (`deploy/ACCEPTANCE.md`) describe what was
  proven at the time.
- Image title label / `package.json` name `aau-payload-platform` are cosmetic,
  not a trust boundary.
- GitHub settings, `STAGING_VPS_READY`, `PRODUCTION_VPS_READY` and the
  disabled state of `deploy-staging.yml` are not changed by this contract.

## 4. Operator procedure before the old namespace is retired

Agent B / the GitHub administrator, in this order. Steps that write to GHCR or
the host need their own authorization and evidence.

1. **Inventory recovery points (read-only, per environment).**
   ```bash
   cat /srv/aau/staging/deploy/deployed-image
   sed -n 's/.*"app_image": *"\([^"]*\)".*/\1/p' /srv/aau/staging/backups/*/metadata.json | sort | uniq -c
   ```
   Repeat for `/srv/aau/production`. Classify each reference as current,
   legacy-same-environment, or something else (the latter is a finding; it
   will be refused).
2. **Keep the legacy pull working while you migrate.** When the new Staging
   puller credential is installed into `/srv/aau/staging/docker`, move the
   existing working store to `/srv/aau/staging/docker-legacy` (root `0700`,
   `config.json` `0600`) instead of discarding it. Same for production if it
   ever holds one. Never put both logins in one store: a Docker store holds one
   credential per registry host.
3. **Copy each recovery digest you need to keep into the current package,
   digest-for-digest.** Use a tool that copies the manifest bytes unchanged,
   for example `crane copy <legacy>@sha256:D <current>:recovery-<short-D>` or
   `skopeo copy --preserve-digests`. Do **not** use a rebuild, and do not use
   `docker buildx imagetools create` (it can rewrite the index). Then prove:
   `crane digest <current>@sha256:D` returns exactly `sha256:D`. The published
   images are plain manifests (`provenance: false`), which keeps this simple.
   The copy is made by an administrator, not by `build-publish.yml`; its OCI
   `revision`/`source` labels still name the old repository — that is correct
   history, not a defect. Artifact attestations are not transferred (they are
   disabled today: `ARTIFACT_ATTESTATIONS_AVAILABLE=false`).
4. **Grant read on the private current package to that environment's puller
   only** (Staging puller → `aau-platform-staging`; Production puller →
   `aau-platform`). Never make a package public to get a pull working.
5. **Prove each copy from the host** with the environment's own credential
   store: `DOCKER_CONFIG=/srv/aau/<env>/docker docker pull <current>@sha256:D`.
6. **Only then** revoke the old pull credentials and remove
   `<root>/docker-legacy`. After that, a legacy-paired backup restores only via
   its digest-identical current-channel copy (or the host cache), and
   `restore.sh` says so explicitly when neither exists.

## 5. Rollback

- Host scripts: keep root-only copies of the previously installed
  `deploy-entrypoint.sh`, `restore.sh` and `lib/environment.sh` per
  environment. Reinstalling them returns the host to legacy-only channels.
  Do this only while `deployed-image` still names a legacy build: once a
  current-channel release is deployed, the old scripts would refuse its
  backups.
- Application: unchanged — restore the verified pre-cutover backup with
  `restore.sh`; its recorded legacy build is honoured by §2.

## 6. Tests

- `tests/deploy/image-channel-drill.sh` — executes the real entrypoint and
  `restore.sh` against a docker stub: channel acceptance/refusal for both
  environments, the production allow-list, all three legacy sources, and every
  refusal (other digest, other environment, other owner, lookalike, tag,
  cross-environment, unobtainable build). Runs in the release gate.
- `tests/docker/restore-guard-drill.sh` A7 — the same boundary against a real
  stack.
- `src/__tests__/config/vps-deployment-contract.test.ts` — structural
  invariants (entrypoint/restore parity, exactly four GHCR constants, order of
  the legacy sources, separate unexported legacy store).
