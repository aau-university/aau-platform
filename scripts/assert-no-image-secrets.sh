#!/usr/bin/env bash
# Fail if secret-shaped material reached the image.
#
# Build args and ENV are readable by anyone who can pull the image, so a secret
# that reached a layer is already disclosed.
#
# This replaces a check that carried a FALSE-NEGATIVE: it asked "does any
# secret-shaped assignment exist?" and "does the approved placeholder appear
# ANYWHERE in the history?", and stayed silent when both were true. One
# legitimate placeholder in one layer therefore exempted a real credential in
# a different layer -- the exemption was global, not per-occurrence.
#
# Here every occurrence is evaluated on its own, and only the exact approved
# placeholder value is permitted.
#
# Usage: assert-no-image-secrets.sh <image-ref>

set -uo pipefail

IMAGE="${1:?usage: assert-no-image-secrets.sh <image-ref>}"

# Names whose value must never be baked in.
readonly SECRET_NAMES='PAYLOAD_SECRET|POSTGRES_[A-Z_]*PASSWORD|APP_DB_PASSWORD|REDIS_PASSWORD|INITIAL_ADMIN_PASSWORD|DATABASE_URI|DATABASE_DIRECT_URI'

# The single approved build-time placeholder. Payload requires SOME value to
# load its config during `next build`; this one is inert and never used at
# runtime. Anything else assigned to a secret-shaped name is a leak.
readonly APPROVED_PLACEHOLDER='build-only-non-production-secret-not-used-at-runtime'

leaks=0

# Report one offending assignment.
report() {
  echo "::error::secret-shaped value baked into the image ($1): ${2%%=*}=<redacted>" >&2
  leaks=$((leaks + 1))
}

# Evaluate every assignment independently. `grep -oE` emits one match per
# occurrence, so a per-occurrence decision is possible at all -- which the
# previous whole-history test could not make.
evaluate() {
  source_label="$1"
  text="$2"

  while IFS= read -r occurrence; do
    [ -n "$occurrence" ] || continue
    value="${occurrence#*=}"
    # Tolerate the shell quoting docker history preserves around values.
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"

    if [ "$value" = "$APPROVED_PLACEHOLDER" ]; then
      echo "  allowed: ${occurrence%%=*} is the approved build-only placeholder"
      continue
    fi
    report "$source_label" "$occurrence"
  done <<EOF
$(printf '%s' "$text" | grep -oE "(${SECRET_NAMES})=[^[:space:]]+" || true)
EOF
}

history="$(docker history --no-trunc --format '{{.CreatedBy}}' "$IMAGE")" || {
  echo "::error::could not read image history for ${IMAGE}" >&2
  exit 1
}
evaluate "layer history" "$history"

# The final image's own environment, which `docker history` does not always
# render for inherited ENV.
config_env="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$IMAGE")" || {
  echo "::error::could not inspect ${IMAGE}" >&2
  exit 1
}
evaluate "image config env" "$config_env"

if [ "$leaks" -ne 0 ]; then
  echo "::error::${leaks} secret-shaped value(s) present in ${IMAGE}" >&2
  exit 1
fi
echo "no secret material found in the image layer history or config env"
