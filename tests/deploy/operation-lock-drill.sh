#!/usr/bin/env bash
# Concurrency proof for deploy/scripts/lib/oplock.sh.
#
# Fault injection, not string matching: real concurrent processes race for the
# real lock and the drill asserts on who actually won.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly OPLOCK="${REPO_ROOT}/deploy/scripts/lib/oplock.sh"
WORK="$(mktemp -d)"
cleanup() {
  # The holders spawn a long-lived child that inherits the lock descriptor;
  # leaving those behind would hold the lock (and the temp dir) after the drill.
  for marker in "${WORK}"/*.child; do
    [[ -f "$marker" ]] && kill -9 "$(<"$marker")" 2>/dev/null || true
  done
  rm -rf "$WORK"
}
trap cleanup EXIT

pass=0
fail=0
check() {
  if [[ "$2" == "$3" ]]; then
    printf '  ok   %s\n' "$1"; pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       actual:   %s\n' "$1" "$3" "$2"; fail=$((fail + 1))
  fi
}

LOCK="${WORK}/operations.lock"

# A holder that takes the lock, signals readiness, then waits to be told to exit.
cat > "${WORK}/holder.sh" <<HOLDER
#!/usr/bin/env bash
set -euo pipefail
source "${OPLOCK}"
oplock_acquire "\$1" "\$2"

# Optionally spawn a LONG-LIVED child that inherits the lock descriptor, and
# record its PID.
#
# Step 6 needs a child that DETERMINISTICALLY still exists when the holder is
# killed. Relying on the transient `sleep` of the polling loop below was flaky:
# on a loaded runner the kill can land in the gap between two sleeps, when the
# holder has no child at all, so the lock frees immediately and the step
# asserted scheduling rather than semantics.
#
# It is OPT-IN because the other steps assert the opposite property — that the
# lock frees once the holder is gone — and an always-on inherited child would
# keep it held and make those steps wrong.
if [[ "\${5:-}" == "with-child" ]]; then
  sleep 3600 &
  printf '%s' "\$!" > "\$3.child"
fi

touch "\$3"
while [[ ! -f "\$4" ]]; do sleep 0.05; done
HOLDER
chmod +x "${WORK}/holder.sh"

# A contender that tries once and reports whether it got in.
cat > "${WORK}/contender.sh" <<CONTENDER
#!/usr/bin/env bash
set -uo pipefail
source "${OPLOCK}"
if oplock_acquire "\$1" "\$2" 2>/dev/null; then echo ACQUIRED; else echo REFUSED; fi
CONTENDER
chmod +x "${WORK}/contender.sh"

echo "1. a second operation is refused while the first holds the lock"
"${WORK}/holder.sh" "$LOCK" deploy "${WORK}/ready" "${WORK}/release" &
holder_pid=$!
while [[ ! -f "${WORK}/ready" ]]; do sleep 0.05; done

# Every pairing the contract must exclude. env -u clears the handoff so these
# are genuine unrelated processes, exactly like an operator on a second shell.
for op in restore backup seed deploy; do
  result="$(env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID "${WORK}/contender.sh" "$LOCK" "$op")"
  check "$op is refused while deploy holds the lock" "$result" "REFUSED"
done

echo "2. the same lock reached by a different path is still one lock"
alias_path="${WORK}/./sub/../operations.lock"
mkdir -p "${WORK}/sub"
result="$(env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID "${WORK}/contender.sh" "$alias_path" restore)"
check "path-aliased lock is refused" "$result" "REFUSED"

echo "3. a descendant of the holder proceeds (no self-deadlock)"
# This is the deploy -> backup.sh case. The handoff variables are exported by
# the holder, so a child sees them. Simulated here by exporting them explicitly
# with the LIVE holder pid.
result="$(AAU_OPLOCK_FILE="$(readlink -f "$LOCK")" AAU_OPLOCK_PID="$holder_pid" \
  "${WORK}/contender.sh" "$LOCK" backup)"
check "nested backup proceeds under the holder's lock" "$result" "ACQUIRED"

echo "4. a STALE handoff from a dead holder does not grant the lock"
# 2^22 is above the default pid_max on Linux, so it can never be a live pid.
result="$(AAU_OPLOCK_FILE="$(readlink -f "$LOCK")" AAU_OPLOCK_PID=4194304 \
  "${WORK}/contender.sh" "$LOCK" backup)"
check "stale handoff falls through to a real acquisition and is refused" "$result" "REFUSED"

echo "5. the lock is released when the holder exits"
touch "${WORK}/release"
wait "$holder_pid"
# Retry briefly rather than probing once. `wait` returns when the HOLDER exits,
# but its polling loop's transient `sleep` child can outlive it by a few
# milliseconds still carrying the inherited descriptor — the same semantics
# step 6 asserts deliberately. Probing exactly once made this assert scheduling
# rather than behaviour, and it failed intermittently on a loaded CI runner.
for _ in $(seq 1 60); do
  result="$(env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID "${WORK}/contender.sh" "$LOCK" deploy)"
  [[ "$result" == "ACQUIRED" ]] && break
  sleep 0.1
done
check "lock is free once the holder and its in-flight children have exited" "$result" "ACQUIRED"

echo "6. a SIGKILLed holder releases the lock once its in-flight children exit"
# MEASURED semantics, asserted rather than assumed: flock is held per open file
# DESCRIPTION, and children inherit it. Killing only the holder therefore leaves
# the lock held by any descendant still running — which is correct, because that
# descendant is the in-flight work. The lock frees when the whole tree is gone.
rm -f "${WORK}/ready" "${WORK}/ready.child" "${WORK}/release"
"${WORK}/holder.sh" "$LOCK" deploy "${WORK}/ready" "${WORK}/release" with-child &
killed_pid=$!
while [[ ! -f "${WORK}/ready.child" ]]; do sleep 0.05; done
while [[ ! -f "${WORK}/ready" ]]; do sleep 0.05; done
inherited_child="$(<"${WORK}/ready.child")"

# Kill ONLY the holder. Its recorded child is still running and still holds an
# inherited copy of the descriptor, so the lock must stay held.
kill -9 "$killed_pid" 2>/dev/null || true
wait "$killed_pid" 2>/dev/null || true
kill -0 "$inherited_child" 2>/dev/null \
  || { printf '  FAIL the inherited-descriptor child did not survive the holder\n'; fail=$((fail + 1)); }

result="$(env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID "${WORK}/contender.sh" "$LOCK" restore)"
check "lock is still held while an inherited-descriptor child runs" "$result" "REFUSED"

# End that child; the last descriptor closes and the lock frees.
kill -9 "$inherited_child" 2>/dev/null || true
for _ in $(seq 1 60); do
  result="$(env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID "${WORK}/contender.sh" "$LOCK" restore)"
  [[ "$result" == "ACQUIRED" ]] && break
  sleep 0.1
done
check "lock is free once the last inherited descriptor is closed" "$result" "ACQUIRED"

echo "7. OPLOCK_WAIT_SECONDS queues rather than failing"
rm -f "${WORK}/ready" "${WORK}/ready.child" "${WORK}/release"
"${WORK}/holder.sh" "$LOCK" deploy "${WORK}/ready" "${WORK}/release" &
holder_pid=$!
while [[ ! -f "${WORK}/ready" ]]; do sleep 0.05; done
( sleep 1; touch "${WORK}/release" ) &
result="$(OPLOCK_WAIT_SECONDS=20 env -u AAU_OPLOCK_FILE -u AAU_OPLOCK_PID \
  OPLOCK_WAIT_SECONDS=20 "${WORK}/contender.sh" "$LOCK" backup)"
check "a waiting operation acquires once the holder exits" "$result" "ACQUIRED"
wait "$holder_pid" 2>/dev/null || true

printf '\n[operation-lock-drill] %d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
