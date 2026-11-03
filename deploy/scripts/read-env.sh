#!/usr/bin/env bash
# Faithful, non-evaluating reader for the deployment env file.
#
# ── Why this exists ───────────────────────────────────────────────────────
# The env file is consumed by TWO readers: `docker compose --env-file`, which
# is what actually configures the containers, and these shell scripts, which
# need a handful of NON-secret values (role names, the database name).
#
# A shell `source` of that file was the original approach and is dangerous:
# `source` EVALUATES its input, so a legitimate strong password containing
# `$(...)`, backticks or `$VAR` would be executed as shell. A secret file is
# the last place that should run as code. This reader never evaluates anything.
#
# ── Why it also refuses values instead of guessing ────────────────────────
# Not evaluating is necessary but not sufficient. The second reader must not
# silently DISAGREE with the first, or a script would act on a different value
# than the container received. Compose's env-file parser was measured (see
# tests/deploy/env-contract-drill.sh) and does all of this:
#
#   VALUE=a$B      -> interpolates $B                (value is NOT literal)
#   VALUE=a${B}c   -> interpolates ${B}              (value is NOT literal)
#   VALUE=a$$B     -> literal "a$B"
#   VALUE=abc #x   -> truncated to "abc"             (unquoted ` #` is a comment)
#   VALUE="a\nb"   -> escape sequences are processed (value is NOT literal)
#   VALUE="a$B"    -> interpolated inside double quotes
#   VALUE='a$B #x' -> fully literal, quotes stripped
#
# Only single quotes are unconditionally literal. So this reader reproduces
# exactly the forms it can reproduce, and returns a hard error for the forms
# whose meaning depends on interpolation it deliberately does not perform.
# Failing closed on an ambiguous line is right: the alternative is a script
# quietly using `aau_$HOME` where the container got `aau_/root`.
#
# The deployment env file contract (deploy/.env.production.example) therefore
# requires every secret to be SINGLE-QUOTED, which is also the only form in
# which a strong random password is guaranteed to arrive unmangled.

# read_env_var <file> <KEY>
# Prints KEY's literal value (last assignment wins, matching env-file
# semantics). Returns 1 if the key is absent, 2 if the line's value cannot be
# reproduced without interpolation. Never evaluates the value.
read_env_var() {
  local file="$1" key="$2" line value
  [[ -f "$file" ]] || return 1

  # Anchored key match, skipping comment lines. A literal key — no globbing,
  # no eval.
  line="$(grep -E "^[[:space:]]*${key}=" "$file" 2>/dev/null | grep -vE '^[[:space:]]*#' | tail -n1)"
  [[ -n "$line" ]] || return 1

  value="${line#*=}"

  if [[ "$value" == \'* ]]; then
    # Single-quoted: literal in compose, and literal here. Must be terminated,
    # and nothing may follow the closing quote — compose would not treat a
    # trailing fragment as part of the value.
    if [[ "$value" != *\' || "${#value}" -lt 2 ]]; then
      printf 'read-env: %s in %s opens a single quote that is never closed\n' "$key" "$file" >&2
      return 2
    fi
    printf '%s' "${value:1:${#value}-2}"
    return 0
  fi

  if [[ "$value" == \"* ]]; then
    if [[ "$value" != *\" || "${#value}" -lt 2 ]]; then
      printf 'read-env: %s in %s opens a double quote that is never closed\n' "$key" "$file" >&2
      return 2
    fi
    value="${value:1:${#value}-2}"
    # Inside double quotes compose interpolates `$` and processes backslash
    # escapes. Reproducing either here would mean re-implementing an
    # interpolator over a secrets file; refuse instead.
    if [[ "$value" == *'$'* || "$value" == *'\'* ]]; then
      printf 'read-env: %s in %s is double-quoted and contains $ or a backslash, which compose interpolates or unescapes. Single-quote the value instead.\n' "$key" "$file" >&2
      return 2
    fi
    printf '%s' "$value"
    return 0
  fi

  # Unquoted. Compose truncates at an unquoted ` #` and interpolates `$`.
  if [[ "$value" == *' #'* || "$value" == *$'\t#'* ]]; then
    printf 'read-env: %s in %s contains an inline comment marker, so compose would truncate it. Single-quote the value instead.\n' "$key" "$file" >&2
    return 2
  fi
  if [[ "$value" == *'$'* ]]; then
    printf 'read-env: %s in %s is unquoted and contains $, which compose interpolates. Single-quote the value instead.\n' "$key" "$file" >&2
    return 2
  fi
  printf '%s' "$value"
}

# require_env_var <file> <KEY> — like read_env_var but fails with a message if
# the key is missing or empty. Prints the value on success.
require_env_var() {
  local value status
  value="$(read_env_var "$1" "$2")"
  status=$?
  if (( status != 0 )) || [[ -z "$value" ]]; then
    printf '%s missing or unreadable in %s\n' "$2" "$1" >&2
    return 1
  fi
  printf '%s' "$value"
}
