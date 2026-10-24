#!/usr/bin/env bash
# Assert the final runner image is a source-free, self-sufficient production
# artifact.
#
# Two properties are checked:
#
#   1. Source protection (§18.2) — the image carries no repository checkout,
#      no project TypeScript tree, no tests/plans/reports, no real .env files.
#      The achievable goal is "no original repository checkout and no
#      intentional project source", not DRM against a VPS root user.
#
#   2. Migration self-sufficiency (§5.3) — the compiled migration modules were
#      actually traced into .next/standalone. This is the proof that the VPS
#      does not need the source-containing `operations` image, and it is why
#      `src/migrations` is imported statically by the Payload config.
#
# Usage: scripts/assert-runner-image.sh <image-reference>

set -euo pipefail

[[ $# -eq 1 ]] || { echo "usage: $0 <image-reference>" >&2; exit 1; }
readonly IMAGE="$1"

failures=0
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }

echo "Inspecting ${IMAGE}"

# Enumerate the filesystem once from a throwaway container.
listing="$(mktemp)"
trap 'rm -f "$listing"' EXIT
docker run --rm --entrypoint sh "$IMAGE" -c 'find /app -type f -o -type d' > "$listing"

echo
echo "Source-leak assertions:"

# A repository checkout or project source tree must not be present. `/app/src`
# is checked as an exact directory: `.next/standalone` legitimately contains
# compiled chunks, and dependencies under node_modules may legitimately ship
# their own .ts declarations — a naive "no .ts anywhere" rule would be wrong.
for forbidden in /app/src /app/.git /app/tests /app/plans /app/docs /app/scripts /app/playwright.config.ts /app/tsconfig.json /app/pnpm-lock.yaml; do
  if grep -qx "$forbidden" "$listing"; then
    fail "project artifact present in image: ${forbidden}"
  else
    pass "absent: ${forbidden}"
  fi
done

# ── The one-shot Seed artifact ────────────────────────────────────────────
# The canonical Seed ships as a single bundled `.mjs`, not as a source tree plus
# a TypeScript loader. That is what lets the VPS run an explicit full Seed
# without ever receiving the source-containing `operations` image.
if docker run --rm --entrypoint sh "$IMAGE" -c 'test -f /app/seed-runner.mjs'; then
  pass "the one-shot Seed artifact is present"
else
  fail "the runner image does not contain /app/seed-runner.mjs"
fi

# It must be COMPILED, and must not have dragged the source tree in with it: an
# import of a `.ts` path would mean the bundle is not self-contained.
if docker run --rm --entrypoint sh "$IMAGE" -c \
    'grep -qE "from .[^\"'"'"']*\.ts.|require\(.[^\"'"'"']*\.ts.\)" /app/seed-runner.mjs'; then
  fail "the seed artifact still imports TypeScript sources"
else
  pass "the seed artifact imports no TypeScript source"
fi

# It must actually LOAD in the image, resolving its externals from the
# standalone node_modules. Running it with no --mode makes it fail at argument
# parsing, which proves the whole module graph loaded without touching a
# database. A missing-dependency failure looks completely different.
#
# This also proves the entry-point guard in one-shot.ts still fires after
# esbuild bundling. If it did not, the seed would load, do nothing, and exit 0
# — an operator would see a clean run and an unseeded database.
# The STATUS is captured as well as the output. The contract is that a missing
# --mode makes the runner FAIL, and a bundle that printed the usage text and
# then exited 0 would satisfy an output-only check while silently doing nothing
# — which is the failure this probe exists to catch. `|| var=$?` is the
# set -e-safe idiom: `set -e` is suspended for the left operand of `||`.
seed_status=0
seed_probe="$(docker run --rm --entrypoint node "$IMAGE" /app/seed-runner.mjs 2>&1)" || seed_status=$?
case "$seed_probe" in
  *"--mode must be"*)
    if (( seed_status != 0 )); then
      pass "the seed artifact loads and validates its arguments"
    else
      fail "the seed artifact printed the usage text but exited 0 on a missing --mode"
    fi ;;
  *"Cannot find"*|*"ERR_MODULE_NOT_FOUND"*)
    fail "the seed artifact cannot resolve its dependencies in the runner image: ${seed_probe}" ;;
  *)
    fail "unexpected seed artifact output: ${seed_probe}" ;;
esac

# ── The one-shot version-backfill artifact ────────────────────────────────
# The canonical version backfill is a MIGRATION step that must be runnable on
# the VPS against the scratch database, so it ships on exactly the same terms as
# the Seed: one compiled bundle, no source tree, no TypeScript loader.
if docker run --rm --entrypoint sh "$IMAGE" -c 'test -f /app/version-backfill-runner.mjs'; then
  pass "the one-shot version-backfill artifact is present"
else
  fail "the runner image does not contain /app/version-backfill-runner.mjs"
fi

if docker run --rm --entrypoint sh "$IMAGE" -c \
    'grep -qE "from .[^\"'"'"']*\.ts.|require\(.[^\"'"'"']*\.ts.\)" /app/version-backfill-runner.mjs'; then
  fail "the version-backfill artifact still imports TypeScript sources"
else
  pass "the version-backfill artifact imports no TypeScript source"
fi

# Running it with no --mode must fail at argument parsing. That proves the whole
# module graph loads inside the image without touching a database, and that the
# entry-point guard still fires after esbuild bundling — a bundle whose guard
# was optimised away would exit 0 having silently backfilled nothing.
backfill_status=0
backfill_probe="$(docker run --rm --entrypoint node "$IMAGE" /app/version-backfill-runner.mjs 2>&1)" || backfill_status=$?
case "$backfill_probe" in
  *"--mode must be"*)
    if (( backfill_status != 0 )); then
      pass "the version-backfill artifact loads and validates its arguments"
    else
      fail "the version-backfill artifact printed the usage text but exited 0 on a missing --mode"
    fi ;;
  *"Cannot find"*|*"ERR_MODULE_NOT_FOUND"*)
    fail "the version-backfill artifact cannot resolve its dependencies in the runner image: ${backfill_probe}" ;;
  *)
    fail "unexpected version-backfill artifact output: ${backfill_probe}" ;;
esac

# Real environment files must never be baked in.
if grep -Eq '^/app/\.env(\..*)?$' "$listing"; then
  fail "an .env file is present in the image"
else
  pass "no .env file in the image"
fi

# Historical planning documents must not ship.
if grep -Eq '^/app/(TEAM_LOG|ORCHESTRATOR-WORKLOG|PROBLEMS-AND-SOLUTIONS|EXECUTION_PLAN|BRIEF)' "$listing"; then
  fail "planning/history documents are present in the image"
else
  pass "no planning/history documents in the image"
fi

# ── No package manager in the production runtime ──────────────────────────
# The base image bundles the npm CLI and corepack. A source-free runtime never
# invokes either, and their vendored dependency copies (tar, ip-address,
# undici, brace-expansion) were the entire runner-image finding set of the
# release gate's image scan — vulnerable code this application does not use and
# cannot upgrade, because it belongs to npm rather than to the lockfile. The
# Dockerfile deletes them. This asserts the deletion, so a base-image bump
# cannot quietly reintroduce them.
pm_probe="$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'for b in npm npx corepack pnpm yarn; do command -v "$b" 2>/dev/null; done; \
   ls -A /usr/local/lib/node_modules 2>/dev/null' || true)"
if [[ -z "${pm_probe//[[:space:]]/}" ]]; then
  pass "no package manager is present in the runtime image"
else
  fail "package manager present in the runtime image: $(tr '\n' ' ' <<<"$pm_probe")"
fi

# The specific vendored copies the image scan reported must be gone. Naming
# them keeps this honest: if a future base image ships npm somewhere else, the
# check above still catches it, and this one says what was actually removed.
for vendored in tar ip-address undici brace-expansion; do
  if docker run --rm --entrypoint sh "$IMAGE" -c \
      "test -e /usr/local/lib/node_modules/npm/node_modules/${vendored}" 2>/dev/null; then
    fail "npm's vendored ${vendored} is still in the image"
  else
    pass "npm's vendored ${vendored} is absent"
  fi
done

# Removing npm must not have taken the Node runtime with it.
node_probe="$(docker run --rm --entrypoint node "$IMAGE" -e 'console.log(process.version)' 2>&1 || true)"
if [[ "$node_probe" == v* ]]; then
  pass "the Node runtime still works after the removal (${node_probe})"
else
  fail "node is no longer usable in the runner image: ${node_probe}"
fi

# No build-time secret-shaped ENV may survive into the runtime image config.
env_config="$(docker image inspect --format '{{json .Config.Env}}' "$IMAGE")"
for secret_name in PAYLOAD_SECRET DATABASE_URI DATABASE_DIRECT_URI POSTGRES_PASSWORD INITIAL_ADMIN_PASSWORD; do
  if grep -q "\"${secret_name}=" <<<"$env_config"; then
    fail "runtime image config carries ${secret_name}"
  else
    pass "runtime image config has no ${secret_name}"
  fi
done

# ── sharp actually works inside the image ─────────────────────────────────
# Not a file-existence check. sharp 0.35 moves its native binding and libvips
# into @img/* packages that Next standalone tracing does not follow, and the
# first attempt at that upgrade produced an image that started and then failed
# every request with ERR_DLOPEN_FAILED. A test that only looked for files would
# have passed on some of those states. Loading the module and performing a real
# resize is the only assertion that distinguishes "the files are there" from
# "image processing works".
echo
echo "Image-processing assertions:"
sharp_probe="$(docker run --rm --entrypoint node "$IMAGE" \
  -e 'const s=require("sharp");s({create:{width:8,height:8,channels:3,background:"#f00"}}).png().toBuffer().then(b=>console.log("SHARP_OK",s.versions.vips,b.length)).catch(e=>{console.log("SHARP_FAIL",e.message)})' 2>&1 || true)"
case "$sharp_probe" in
  *SHARP_OK*)
    pass "sharp loads and resizes inside the runner image (${sharp_probe#*SHARP_OK })" ;;
  *ERR_DLOPEN_FAILED*|*"cannot open shared object"*)
    fail "sharp cannot load its native library in the runner image — the @img platform packages were not traced in: ${sharp_probe}" ;;
  *)
    fail "sharp probe failed in the runner image: ${sharp_probe}" ;;
esac

echo
echo "Runtime-identity assertions:"

# The runner must execute as the unprivileged nextjs:nodejs user (UID/GID
# 10001:10001), never root, and must be able to WRITE /app/uploads — otherwise
# media writes fail at runtime while /api/health still answers, exactly the kind
# of "looks up, is broken" state a health check does not catch. `--entrypoint`
# overrides the command but NOT the image's `USER`, so these run with the
# identity the container uses by default; a Dockerfile that reverted to root, or
# to a different uid than the uploads owner, fails here.
id_probe="$(docker run --rm --entrypoint sh "$IMAGE" -c 'printf "%s:%s" "$(id -u)" "$(id -g)"' 2>&1 || true)"
if [[ "$id_probe" == "10001:10001" ]]; then
  pass "the runner runs as UID:GID 10001:10001 (non-root)"
else
  fail "the runner does not run as 10001:10001 (got '${id_probe}')"
fi

# A real write as the default user, not a file-existence check: this proves the
# uploads directory is owned by the same identity the process runs as.
write_probe="$(docker run --rm --entrypoint sh "$IMAGE" -c \
  'p="/app/uploads/.write-probe.$$"; (echo ok > "$p" && cat "$p" && rm -f "$p") 2>&1' || true)"
if [[ "$write_probe" == "ok" ]]; then
  pass "the runtime user can write to /app/uploads"
else
  fail "the runtime user cannot write to /app/uploads: ${write_probe}"
fi

echo
echo "Credential-pattern assertions:"

# `docker history` is the check everyone runs and the wrong one for a
# multi-stage build: a credential passed as ARG into a builder stage never
# reaches the shipped layers, so the history is clean while the value is public
# anyway. buildx records build arguments VERBATIM in the SLSA provenance
# attestation of a pushed image.
#
# So scan for credential *patterns*, not for argument names — the attestation
# also embeds commit messages and RUN command lines, so matching on a name like
# "PAYLOAD_SECRET" reports a leak that is not there.
#
# This build passes only non-secret arguments (the public origin plus git
# metadata), which is what makes it safe; this check is the thing that fails if
# that ever changes.
credential_patterns='gh[pousr]_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----'

history_hits="$(docker history --no-trunc --format '{{.CreatedBy}}' "$IMAGE" 2>/dev/null \
  | grep -coE "$credential_patterns" || true)"
if [[ "${history_hits:-0}" -eq 0 ]]; then
  pass "no credential-shaped values in the image build history"
else
  fail "${history_hits} credential-shaped value(s) found in the image build history"
fi

# Provenance only exists for a pushed image; skip cleanly for a local build.
if provenance="$(docker buildx imagetools inspect "$IMAGE" --format '{{json .Provenance}}' 2>/dev/null)" \
   && [[ -n "$provenance" && "$provenance" != "null" ]]; then
  prov_hits="$(grep -coE "$credential_patterns" <<<"$provenance" || true)"
  if [[ "${prov_hits:-0}" -eq 0 ]]; then
    pass "no credential-shaped values in the SLSA provenance attestation"
  else
    fail "${prov_hits} credential-shaped value(s) found in the provenance attestation"
  fi
else
  echo "  ....  no published provenance to inspect (local build) — skipped"
fi

echo
echo "Migration self-sufficiency assertions:"

# The compiled migration modules must have been traced into the standalone
# output. Without this, `prodMigrations` would have nothing to apply and the
# VPS would silently still need the operations image.
# Migrations are compiled into the server bundle rather than emitted as
# standalone files, so search the compiled output for a migration name that
# exists nowhere but src/migrations.
# Migrations are compiled into the Next server chunks rather than emitted as
# their own files, so assert on content: this migration name exists nowhere in
# the project except src/migrations.
migration_chunks="$(docker run --rm --entrypoint sh "$IMAGE" -c \
  "grep -rl '20260815_025241_one_study_plan_per_program' /app/.next 2>/dev/null | wc -l")"
if [[ "${migration_chunks:-0}" -gt 0 ]]; then
  pass "committed migration definitions are compiled into the runner (${migration_chunks} chunk(s))"
else
  fail "no migration definitions found in the runner image — prodMigrations would be a no-op"
fi

# The migration bodies, not just their names, must be present.
if docker run --rm --entrypoint sh "$IMAGE" -c \
  "grep -rl 'study_plans_academic_program_idx' /app/.next 2>/dev/null | wc -l" | grep -qv '^0$'; then
  pass "migration SQL bodies are present in the compiled output"
else
  fail "migration SQL bodies are missing from the compiled output"
fi

# server.js is the standalone entry point the container actually runs.
if grep -qx '/app/server.js' "$listing"; then
  pass "standalone entry point /app/server.js present"
else
  fail "missing /app/server.js"
fi

echo
if (( failures > 0 )); then
  echo "${failures} assertion(s) failed."
  exit 1
fi
echo "All runner image assertions passed."
