#!/bin/sh
set -eu

manifest_hash="$(sha256sum package.json pnpm-lock.yaml | sha256sum | awk '{print $1}')"
marker="node_modules/.aau-pnpm-lock-hash"

if [ ! -d node_modules/.pnpm ] || [ ! -f "$marker" ] || [ "$(cat "$marker")" != "$manifest_hash" ]; then
  CI=true pnpm install --frozen-lockfile --prefer-offline
  printf '%s\n' "$manifest_hash" > "$marker"
fi

exec "$@"
