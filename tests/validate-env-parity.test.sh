#!/usr/bin/env bash
# tests/validate-env-parity.test.sh
# Unit tests for scripts/validate-env-parity.sh
# Run: bash tests/validate-env-parity.test.sh

set -uo pipefail

SCRIPT="$(dirname "$0")/../scripts/validate-env-parity.sh"
PASS=0
FAIL=0
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

assert_exit() {
  local desc="$1" expected="$2"
  shift 2
  local actual
  bash "$SCRIPT" "$@" > /dev/null 2>&1 && actual=0 || actual=$?
  if [[ "$actual" -eq "$expected" ]]; then
    echo "  PASS: $desc"
    ((PASS++))
  else
    echo "  FAIL: $desc (expected exit $expected, got $actual)"
    ((FAIL++))
  fi
}

# --- fixtures ---
EXAMPLE="$TMPDIR/.env.example"
COMPLETE="$TMPDIR/.env.complete"
MISSING="$TMPDIR/.env.missing"
EMPTY="$TMPDIR/.env.empty"

printf 'FOO=1\nBAR=2\nBAZ=3\n' > "$EXAMPLE"
printf 'FOO=x\nBAR=y\nBAZ=z\n' > "$COMPLETE"
printf 'FOO=x\nBAR=y\n'        > "$MISSING"   # BAZ missing
printf ''                       > "$EMPTY"

# --- tests ---
echo "validate-env-parity.sh"

assert_exit "exits 0 when all keys present"   0 "$EXAMPLE" "$COMPLETE"
assert_exit "exits 1 when a key is missing"   1 "$EXAMPLE" "$MISSING"
assert_exit "exits 1 when .env is empty"      1 "$EXAMPLE" "$EMPTY"
assert_exit "exits 2 with no arguments"       2
assert_exit "exits 2 with one argument"       2 "$EXAMPLE"
assert_exit "exits 2 when example not found"  2 "$TMPDIR/nonexistent.example" "$COMPLETE"
assert_exit "exits 1 when .env not found"     1 "$EXAMPLE" "$TMPDIR/nonexistent.env"

# Comments and blank lines in example should be ignored
EXAMPLE_WITH_COMMENTS="$TMPDIR/.env.example.comments"
printf '# comment\n\nFOO=1\n# another comment\nBAR=2\n' > "$EXAMPLE_WITH_COMMENTS"
ENV_WITH_KEYS="$TMPDIR/.env.keys"
printf 'FOO=a\nBAR=b\n' > "$ENV_WITH_KEYS"
assert_exit "ignores comments and blank lines in example" 0 "$EXAMPLE_WITH_COMMENTS" "$ENV_WITH_KEYS"

# --- summary ---
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
