#!/usr/bin/env bash
# Proves the deployment env-file contract against REAL `docker compose`, and
# proves deploy/scripts/read-env.sh agrees with it.
#
# This is a measurement, not an assertion about documentation. The entire
# secrets design — "single-quote every value" — rests on how compose actually
# parses an env file, so that behaviour is re-measured on every run rather than
# trusted to a doc page that may describe a different Compose version.
#
# Deliberately difficult NON-PRODUCTION dummy values are used: they contain the
# interpolation and URI-reserved characters that a strong random password
# realistically contains.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/read-env.sh
source "${REPO_ROOT}/deploy/scripts/read-env.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %q\n       actual:   %q\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}

# A password an operator could plausibly generate, containing every character
# class that breaks one parser or another: interpolation, comment, URI-reserved,
# percent, space.
readonly HOSTILE="p@ss:w/rd?x=1&y#z\$HOME\${HOME}%20 end!"

cat > "${WORK}/env" <<EOF
POSTGRES_ADMIN_USER='aau_admin'
POSTGRES_DB='aau_platform'
APP_DB_USER='aau_app'
APP_DB_PASSWORD='${HOSTILE}'
PAYLOAD_SECRET='${HOSTILE}-payload'
UNQUOTED_DOLLAR=a\$POSTGRES_DB.b
UNQUOTED_COMMENT=abc #not part of the value
DOUBLE_QUOTED_ESCAPE="a\\nb"
DOUBLE_QUOTED_DOLLAR="a\$POSTGRES_DB"
DOUBLE_QUOTED_PLAIN="plain value"
EOF

# A separate fixture: compose REFUSES to parse a whole file containing an
# unterminated quote (measured in step 6), so this case cannot live in the file
# used for the compose probes above.
cat > "${WORK}/env-unterminated" <<'EOF'
POSTGRES_DB='aau_platform'
UNTERMINATED='oops
EOF

cat > "${WORK}/compose.yml" <<'EOF'
services:
  probe:
    image: busybox:latest
    command: ["sh","-c","printf '%s' \"$$PROBE\" | od -An -c | tr -d '\\n'"]
    environment:
      PROBE: ${APP_DB_PASSWORD}
EOF

echo "1. compose delivers a SINGLE-QUOTED hostile password byte for byte"
actual_od="$(docker compose --env-file "${WORK}/env" -f "${WORK}/compose.yml" \
  run --rm --quiet-pull probe 2>/dev/null | tr -s ' ')"
expected_od="$(printf '%s' "$HOSTILE" | od -An -c | tr -d '\n' | tr -s ' ')"
check "single-quoted password survives compose unchanged" "$actual_od" "$expected_od"

echo "2. read-env.sh returns exactly the same bytes compose delivered"
read_back="$(read_env_var "${WORK}/env" APP_DB_PASSWORD)"
check "read-env agrees with compose on the hostile password" "$read_back" "$HOSTILE"
check "read-env agrees on PAYLOAD_SECRET" \
  "$(read_env_var "${WORK}/env" PAYLOAD_SECRET)" "${HOSTILE}-payload"
check "read-env reads plain single-quoted values" \
  "$(read_env_var "${WORK}/env" POSTGRES_ADMIN_USER)" "aau_admin"
check "read-env reads a plain double-quoted value" \
  "$(read_env_var "${WORK}/env" DOUBLE_QUOTED_PLAIN)" "plain value"

echo "3. read-env REFUSES every form whose meaning depends on interpolation"
# These are the forms where a second parser would silently disagree with
# compose. Refusing is the fail-closed choice.
for key in UNQUOTED_DOLLAR UNQUOTED_COMMENT DOUBLE_QUOTED_ESCAPE DOUBLE_QUOTED_DOLLAR; do
  if read_env_var "${WORK}/env" "$key" >/dev/null 2>&1; then
    printf '  FAIL read-env accepted the ambiguous form %s\n' "$key"; fail=$((fail + 1))
  else
    printf '  ok   read-env refuses %s\n' "$key"; pass=$((pass + 1))
  fi
done

if read_env_var "${WORK}/env-unterminated" UNTERMINATED >/dev/null 2>&1; then
  printf '  FAIL read-env accepted an unterminated quote\n'; fail=$((fail + 1))
else
  printf '  ok   read-env refuses UNTERMINATED\n'; pass=$((pass + 1))
fi

echo "4. require_env_var fails closed on a refused line"
if require_env_var "${WORK}/env" UNQUOTED_DOLLAR >/dev/null 2>&1; then
  printf '  FAIL require_env_var accepted an ambiguous line\n'; fail=$((fail + 1))
else
  printf '  ok   require_env_var fails closed\n'; pass=$((pass + 1))
fi

echo "5. the mangling this contract exists to prevent is REAL, not theoretical"
# If compose stopped mangling these, the single-quote rule would be unnecessary
# and this drill should be revisited. Asserting the mangling keeps the docs
# honest about why the rule exists.
cat > "${WORK}/compose2.yml" <<'EOF'
services:
  probe:
    image: busybox:latest
    command: ["sh","-c","printf '%s' \"$$PROBE\""]
    environment:
      PROBE: ${UNQUOTED_COMMENT}
EOF
truncated="$(docker compose --env-file "${WORK}/env" -f "${WORK}/compose2.yml" \
  run --rm --quiet-pull probe 2>/dev/null | tr -d '\r')"
check "an unquoted value IS truncated at an inline comment" "$truncated" "abc"

cat > "${WORK}/compose3.yml" <<'EOF'
services:
  probe:
    image: busybox:latest
    command: ["sh","-c","printf '%s' \"$$PROBE\""]
    environment:
      PROBE: ${UNQUOTED_DOLLAR}
EOF
interpolated="$(docker compose --env-file "${WORK}/env" -f "${WORK}/compose3.yml" \
  run --rm --quiet-pull probe 2>/dev/null | tr -d '\r')"
check "an unquoted \$VAR IS interpolated by compose" "$interpolated" "aaau_platform.b"

echo "6. compose itself refuses a file containing an unterminated quote"
# Both readers fail closed on the same input, from opposite directions: compose
# refuses the whole file, read-env refuses the line. Neither silently invents a
# value.
cat > "${WORK}/compose4.yml" <<'EOF'
services:
  probe:
    image: busybox:latest
    command: ["sh","-c","printf ok"]
    environment:
      PROBE: ${POSTGRES_DB}
EOF
if docker compose --env-file "${WORK}/env-unterminated" -f "${WORK}/compose4.yml" \
    config >/dev/null 2>&1; then
  printf '  FAIL compose accepted an unterminated quoted value\n'; fail=$((fail + 1))
else
  printf '  ok   compose refuses the file outright\n'; pass=$((pass + 1))
fi

printf '\n[env-contract-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
