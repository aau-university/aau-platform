#!/usr/bin/env bash
# Proves production and staging share NOTHING but the host.
#
# ── Why this is a drill and not a code comment ────────────────────────────
# Staging exists to be broken, reset and re-seeded. Every one of those actions
# is safe only because staging's database, Redis, uploads, backups, release
# state and operation lock are different objects from production's. If any one
# of them ever collapsed onto production's — a shared default, a copied env
# file, a forgotten variable — then "reset staging" would silently mean
# "destroy production", and nothing would say so until it happened.
#
# So every isolated value is enumerated here and asserted DIFFERENT, and the
# Compose project isolation is verified against real Docker object names rather
# than inferred from the project setting.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly ENVIRONMENT_LIB="${REPO_ROOT}/deploy/scripts/lib/environment.sh"
readonly VPS_COMPOSE="${REPO_ROOT}/deploy/docker-compose.vps.yml"

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}
differs() {
  if [[ "$2" != "$3" && -n "$2" && -n "$3" ]]; then
    printf '  ok   %s differs (%s vs %s)\n' "$1" "$2" "$3"; pass=$((pass + 1))
  else
    printf '  FAIL %s is SHARED between environments: %s\n' "$1" "$2"; fail=$((fail + 1))
  fi
}

# Resolve each environment in its own subshell so neither can leak state into
# the other — which is also the property being asserted.
dump_env() {
  (
    # shellcheck source=deploy/scripts/lib/environment.sh
    source "$ENVIRONMENT_LIB"
    # `env -i`-like: clear every override so the DEFAULTS are what is tested.
    # DOCKER_CONFIG is cleared too: aau_env_resolve honours an inherited value,
    # so without this both environments could resolve to the SAME registry
    # credential store — which deploy/STAGING_VPS_CONTRACT.md requires to be
    # separate, and which this drill exists to prove.
    unset DEPLOY_ROOT ENV_FILE COMPOSE_FILE STATE_FILE LOCK_FILE BACKUP_ROOT \
      UPLOADS_HOST_PATH COMPOSE_PROJECT_NAME AAU_ENV_ROOT AAU_APP_PORT AAU_CANDIDATE_PORT \
      DOCKER_CONFIG
    aau_env_resolve "$1"
    printf '%s\n' "$AAU_ENV_ROOT" "$AAU_DEPLOY_ROOT" "$AAU_ENV_FILE" "$AAU_STATE_FILE" \
      "$AAU_LOCK_FILE" "$AAU_BACKUP_ROOT" "$AAU_UPLOADS_PATH" "$AAU_PROJECT_NAME" \
      "$AAU_APP_PORT" "$AAU_CANDIDATE_PORT" "$AAU_DOCKER_CONFIG"
  )
}

mapfile -t prod < <(dump_env production)
mapfile -t stag < <(dump_env staging)

readonly LABELS=(
  "environment root"
  "deploy root"
  "env/secrets file"
  "release-state file"
  "operation lock"
  "backup root"
  "uploads path"
  "compose project"
  "stable host port"
  "candidate host port"
  "registry credential store"
)

echo "1. every piece of environment state is distinct"
for i in "${!LABELS[@]}"; do
  differs "${LABELS[$i]}" "${prod[$i]}" "${stag[$i]}"
done

echo
echo "2. neither environment's root is nested inside the other's"
# A nested layout would make a recursive delete or a relative path in one
# environment able to reach the other.
case "${stag[0]}" in
  "${prod[0]}"/*) printf '  FAIL staging root is inside the production root\n'; fail=$((fail + 1)) ;;
  *) printf '  ok   staging root is not inside the production root\n'; pass=$((pass + 1)) ;;
esac
case "${prod[0]}" in
  "${stag[0]}"/*) printf '  FAIL production root is inside the staging root\n'; fail=$((fail + 1)) ;;
  *) printf '  ok   production root is not inside the staging root\n'; pass=$((pass + 1)) ;;
esac

echo
echo "3. an unknown environment is refused, not silently defaulted"
if ( source "$ENVIRONMENT_LIB"; aau_env_resolve production-copy ) >/dev/null 2>&1; then
  printf '  FAIL an unknown environment name was accepted\n'; fail=$((fail + 1))
else
  printf '  ok   an unknown environment name is refused\n'; pass=$((pass + 1))
fi

echo
echo "4. Compose namespaces the volumes and networks per project"
# Compose project isolation is the mechanism the whole design leans on, so it
# is verified against what Compose ACTUALLY resolves, not assumed. Two projects
# over the same file must produce disjoint volume and network names.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ENVSTUB="$(mktemp)"
  trap 'rm -f "$ENVSTUB"' EXIT
  cat > "$ENVSTUB" <<'EOF'
POSTGRES_ADMIN_USER='x'
POSTGRES_ADMIN_PASSWORD='x'
POSTGRES_DB='x'
APP_DB_USER='x'
APP_DB_PASSWORD='x'
REDIS_PASSWORD='x'
PAYLOAD_SECRET='isolation-drill-secret-at-least-32-characters'
INITIAL_ADMIN_EMAIL='x@example.test'
EOF
  names_for() {
    APP_IMAGE=placeholder:isolation docker compose -p "$1" --env-file "$ENVSTUB" \
      -f "$VPS_COMPOSE" config --format json 2>/dev/null \
      | python3 -c 'import json,sys;d=json.load(sys.stdin);print("\n".join(sorted([v.get("name","") for v in d.get("volumes",{}).values()]+[n.get("name","") for n in d.get("networks",{}).values()])))'
  }
  prod_names="$(names_for aau-production || true)"
  stag_names="$(names_for aau-staging || true)"

  if [[ -z "$prod_names" || -z "$stag_names" ]]; then
    printf '  FAIL could not resolve compose object names\n'; fail=$((fail + 1))
  else
    shared="$(comm -12 <(printf '%s\n' "$prod_names") <(printf '%s\n' "$stag_names") | grep -c . || true)"
    check "no volume or network name is shared between the projects" "$shared" "0"
    printf '  ....  production objects: %s\n' "$(printf '%s' "$prod_names" | tr '\n' ' ')"
    printf '  ....  staging objects:    %s\n' "$(printf '%s' "$stag_names" | tr '\n' ' ')"
  fi
else
  printf '  ....  docker unavailable; skipping the Compose namespacing check\n'
fi

echo
echo "5. the destructive staging-only operation is refused in production"
# Belt, braces and a third check: seed.sh, seed-entrypoint.sh and the seed
# runner itself must each refuse production.
#
# This used to be `grep -q "STAGING-ONLY"` over all three files, which is a
# grep for a string the files always contain — seed.sh carries it in its own
# header comment at line 31. Deleting the `aau_env_is_production` refusal
# would have left the check green. So seed.sh is now DRIVEN: both modes are
# actually invoked with AAU_ENV=production and must exit non-zero. The refusal
# fires before the env file or the release state is touched, which is why this
# needs no deployed environment.
for mode in reset-and-full full; do
  out=""
  status=0
  out="$(AAU_ENV=production bash "${REPO_ROOT}/deploy/scripts/seed.sh" "$mode" 2>&1)" || status=$?
  if (( status != 0 )) && [[ "$out" == *'STAGING-ONLY'* ]]; then
    printf '  ok   seed.sh REFUSES %s in production (exit %d)\n' "$mode" "$status"; pass=$((pass + 1))
  else
    printf '  FAIL seed.sh did not refuse %s in production (exit %d)\n       %s\n' \
      "$mode" "$status" "$(printf '%s' "$out" | tr '\n' ' ' | cut -c1-200)"; fail=$((fail + 1))
  fi
done

# The other two cannot be driven from here — seed-entrypoint.sh runs inside the
# runner image (tests/docker/seed-one-shot-drill.sh drives it for real), and
# one-shot.ts is TypeScript. Anchor their text checks to the GUARD EXPRESSION
# rather than to a phrase that also appears in prose.
if grep -qE '^\[\[ "\$AAU_ENV" == "staging" \]\] \|\| fail' "${REPO_ROOT}/deploy/scripts/seed-entrypoint.sh"; then
  printf '  ok   seed-entrypoint.sh gates on AAU_ENV == staging\n'; pass=$((pass + 1))
else
  printf '  FAIL seed-entrypoint.sh has no AAU_ENV==staging gate\n'; fail=$((fail + 1))
fi
if grep -q 'isProductionDeployment(' "${REPO_ROOT}/src/seed/one-shot.ts" \
   && grep -q 'if (!isProduction) return' "${REPO_ROOT}/src/seed/one-shot.ts"; then
  printf '  ok   one-shot.ts measures the deployment and returns early only when it is not production\n'
  pass=$((pass + 1))
else
  printf '  FAIL one-shot.ts has no isProductionDeployment gate in assertSeedAllowed\n'
  fail=$((fail + 1))
fi

echo
echo "6. the example env files do not share credentials"
prod_example="${REPO_ROOT}/deploy/.env.production.example"
stag_example="${REPO_ROOT}/deploy/.env.staging.example"
for key in PAYLOAD_SECRET APP_DB_PASSWORD POSTGRES_ADMIN_PASSWORD REDIS_PASSWORD; do
  p_val="$(grep -E "^${key}=" "$prod_example" | head -1)"
  s_val="$(grep -E "^${key}=" "$stag_example" | head -1)"
  differs "$key placeholder" "$p_val" "$s_val"
done

printf '\n[environment-isolation-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
