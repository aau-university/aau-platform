#!/usr/bin/env bash
# Regression proof for scripts/assert-no-image-secrets.sh.
#
# The scanner it replaces exempted the WHOLE image whenever the approved
# build-time placeholder appeared anywhere in the layer history. Step 3 is the
# case that matters: an approved placeholder in one layer AND a real credential
# in another. The old scanner passed that; this one must fail it.

set -uo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly SCANNER="${REPO_ROOT}/scripts/assert-no-image-secrets.sh"
readonly PLACEHOLDER='build-only-non-production-secret-not-used-at-runtime'
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}

mkdir -p "${WORK}/bin"
cat > "${WORK}/bin/docker" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  history) cat "$FAKE_HISTORY" ;;
  inspect) cat "$FAKE_ENV" ;;
  *) exit 1 ;;
esac
STUB
chmod +x "${WORK}/bin/docker"

# Run the scanner against a fabricated history/env pair. Echoes the exit code.
scan() {
  printf '%s\n' "$1" > "${WORK}/history"
  printf '%s\n' "${2:-NODE_ENV=production}" > "${WORK}/env"
  PATH="${WORK}/bin:$PATH" FAKE_HISTORY="${WORK}/history" FAKE_ENV="${WORK}/env" \
    bash "$SCANNER" aau-runner:scan >"${WORK}/out" 2>&1
  echo $?
}
yesno() { [ "$1" -ne 0 ] && echo yes || echo no; }

echo "1. a clean image passes"
rc="$(scan 'RUN pnpm build
ENV NODE_ENV=production')"
check "clean history exits 0" "$rc" "0"

echo "2. the approved build-only placeholder alone is allowed"
rc="$(scan "RUN PAYLOAD_SECRET=${PLACEHOLDER} pnpm build")"
check "approved placeholder exits 0" "$rc" "0"

echo "3. THE REGRESSION: placeholder in one layer, real leak in another"
history="RUN PAYLOAD_SECRET=${PLACEHOLDER} pnpm build
ENV APP_DB_PASSWORD=hunter2-real-production-credential"
rc="$(scan "$history")"
check "a real leak alongside the placeholder FAILS" "$(yesno "$rc")" "yes"
check "the leaking variable is named" "$(grep -c 'APP_DB_PASSWORD=<redacted>' "${WORK}/out")" "1"
check "the real secret value is never echoed" "$(grep -c 'hunter2' "${WORK}/out")" "0"

echo "4. MUTATION: the old whole-history logic must MISS step 3"
PATH="${WORK}/bin:$PATH" bash -c '
  h="$1"
  if printf "%s" "$h" | grep -qiE "(PAYLOAD_SECRET|APP_DB_PASSWORD)=[^ ]" \
     && ! printf "%s" "$h" | grep -qi "build-only-non-production-secret"; then
    exit 1
  fi' _ "$history"
check "the old scanner returns a false negative (proving the bug was real)" "$?" "0"

echo "5. each secret-shaped name is detected on its own"
for name in PAYLOAD_SECRET POSTGRES_PASSWORD APP_DB_PASSWORD REDIS_PASSWORD INITIAL_ADMIN_PASSWORD DATABASE_URI; do
  rc="$(scan "ENV ${name}=a-real-looking-value")"
  check "${name} is caught" "$(yesno "$rc")" "yes"
done

echo "6. a secret in the image CONFIG ENV is caught, not just in layer history"
# Inherited ENV does not always render in `docker history`.
rc="$(scan 'RUN pnpm build' 'NODE_ENV=production
REDIS_PASSWORD=leaked-via-config-env')"
check "config-env leak is caught" "$(yesno "$rc")" "yes"
check "reported against the config-env source" "$(grep -c 'image config env' "${WORK}/out")" "1"

echo "7. a value that merely RESEMBLES the placeholder is not accepted"
rc="$(scan "ENV PAYLOAD_SECRET=${PLACEHOLDER}-but-actually-real")"
check "placeholder prefix is not a free pass" "$(yesno "$rc")" "yes"

echo "8. every occurrence is evaluated, so a later leak is not masked by an earlier pass"
rc="$(scan "RUN PAYLOAD_SECRET=${PLACEHOLDER} build
RUN PAYLOAD_SECRET=${PLACEHOLDER} test
ENV POSTGRES_PASSWORD=real")"
check "trailing leak after two placeholders is caught" "$(yesno "$rc")" "yes"

echo "9. docker failing to read the image is a failure, not a pass"
PATH="${WORK}/bin:$PATH" FAKE_HISTORY="${WORK}/missing" FAKE_ENV="${WORK}/missing" \
  bash "$SCANNER" aau-runner:scan >/dev/null 2>&1
check "unreadable image fails closed" "$(yesno "$?")" "yes"

printf '\n[image-secret-scan-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
