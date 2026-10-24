#!/usr/bin/env bash
# The frozen Neon source contract, and the assertions built on it.
#
# ── Why the contract is a file and not a set of literals in a script ──────
# The same numbers are checked in three places — at export time against the
# live Neon source, after the dump is restored, and after the upgrade against
# the migrated database. Three copies of "123" would drift; one file cannot.
# `src/__tests__/migration/neon-migration-contract.test.ts` pins the file
# against the committed manifest so the two can never disagree either.
#
# ── Why every assertion fails closed ──────────────────────────────────────
# A missing value, an unreadable probe or a psql error must NEVER read as
# "matches". Each helper below treats an empty or non-numeric actual as a
# failure, because the alternative is a migration that reports success on a
# database it could not measure.

# contract_load [file] — sets CONTRACT_<KEY> for every entry.
#
# The file can be pointed elsewhere with NEON_MIGRATION_CONTRACT. That exists
# for the same reason the deploy drills can point a whole environment at a
# temporary directory: the failure paths have to be provable without a 62 MB
# media tree and a real Neon dump. It is not a way to make a real run pass —
# every script that loads the contract LOGS the path it used, and
# `src/__tests__/migration/neon-migration-contract.test.ts` pins the committed
# file against the committed manifest, so a weakened contract is visible in the
# run output and cannot reach the repository.
contract_load() {
  local file="${1:-${NEON_MIGRATION_CONTRACT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/source-contract.env}}"
  [[ -f "$file" ]] || { printf '[contract] ERROR: missing contract file %s\n' "$file" >&2; return 1; }

  local line key value
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    # The contract is a committed, non-secret, plain KEY=VALUE file. It is
    # never `source`d, for the same reason read-env.sh never sources the
    # deployment env file: reading data must not execute it.
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] \
      || { printf '[contract] ERROR: invalid key %q in %s\n' "$key" "$file" >&2; return 1; }
    printf -v "CONTRACT_${key}" '%s' "$value"
    export "CONTRACT_${key}"
  done < "$file"

  [[ -n "${CONTRACT_NEON_SOURCE_FREEZE_DATE:-}" ]] \
    || { printf '[contract] ERROR: %s does not look like the source contract\n' "$file" >&2; return 1; }
  CONTRACT_FILE="$file"
  export CONTRACT_FILE
}

# contract_expect <label> <expected> <actual>
# Records a mismatch instead of exiting, so ONE run reports every difference
# rather than making the operator rediscover them one at a time.
#
# It ALWAYS returns 0, deliberately. Callers run under `set -e`, so returning
# non-zero on a mismatch would abort the script at the FIRST difference —
# before contract_verdict could print any of them, and with an exit status
# whose cause is nowhere in the output. The verdict is the gate; this is the
# ledger. Nothing branches on the return value, and contract_verdict fails the
# run if the counter is non-zero.
CONTRACT_FAILURES=0
CONTRACT_REPORT=()
contract_expect() {
  local label="$1" expected="$2" actual="$3"
  if [[ -z "${actual//[[:space:]]/}" ]]; then
    CONTRACT_REPORT+=("MISSING ${label}: expected ${expected}, probe returned nothing")
    CONTRACT_FAILURES=$((CONTRACT_FAILURES + 1))
    return 0
  fi
  if [[ "$actual" != "$expected" ]]; then
    CONTRACT_REPORT+=("MISMATCH ${label}: expected ${expected}, got ${actual}")
    CONTRACT_FAILURES=$((CONTRACT_FAILURES + 1))
    return 0
  fi
  CONTRACT_REPORT+=("ok ${label} = ${actual}")
  return 0
}

# contract_record <label> <actual> — measured, not asserted (e.g. row counts
# that are compared before/after rather than against a frozen constant).
contract_record() {
  CONTRACT_REPORT+=("recorded ${1} = ${2}")
}

# contract_probe_value <probe-output> <key> — reads one `key=value` line.
contract_probe_value() {
  local output="$1" key="$2"
  printf '%s\n' "$output" | sed -n "s/^${key}=//p" | tail -n1
}

# contract_verdict <phase> — prints the report and returns non-zero if any
# assertion failed.
contract_verdict() {
  local phase="$1" line
  for line in "${CONTRACT_REPORT[@]}"; do printf '[contract] %s\n' "$line" >&2; done
  CONTRACT_REPORT=()
  if (( CONTRACT_FAILURES > 0 )); then
    printf '[contract] ERROR: %s does not match the frozen %s source contract (%d difference(s)).\n' \
      "$phase" "${CONTRACT_NEON_SOURCE_FREEZE_DATE}" "$CONTRACT_FAILURES" >&2
    printf '[contract] The source was frozen on %s. A difference means the freeze was broken,\n' \
      "${CONTRACT_NEON_SOURCE_FREEZE_DATE}" >&2
    printf '[contract] or this is not the expected database. Do NOT edit %s to make this pass.\n' \
      "${CONTRACT_FILE}" >&2
    CONTRACT_FAILURES=0
    return 1
  fi
  printf '[contract] %s matches the frozen %s contract\n' "$phase" "${CONTRACT_NEON_SOURCE_FREEZE_DATE}" >&2
  return 0
}
