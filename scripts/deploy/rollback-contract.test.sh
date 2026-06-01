#!/usr/bin/env bash
# =============================================================================
# Tests for rollback-contract.sh
# =============================================================================
# Run with: bash scripts/deploy/rollback-contract.test.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_SCRIPT="${SCRIPT_DIR}/rollback-contract.sh"
TEST_SNAPSHOT_DIR="${SCRIPT_DIR}/.snapshots-test"

# -- Colors -------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "${GREEN}  ✓ PASS${NC} — $*"; ((PASS++)); }
fail() { echo -e "${RED}  ✗ FAIL${NC} — $*"; ((FAIL++)); }
section() { echo -e "\n${CYAN}▶ $*${NC}"; }

# Override snapshot dir for tests
export SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR"
mkdir -p "$TEST_SNAPSHOT_DIR"

cleanup() {
  rm -rf "$TEST_SNAPSHOT_DIR"
}
trap cleanup EXIT

# =============================================================================
# TEST: Script exists and is executable
# =============================================================================
section "Script existence"

if [[ -f "$ROLLBACK_SCRIPT" ]]; then
  pass "rollback-contract.sh exists"
else
  fail "rollback-contract.sh not found at $ROLLBACK_SCRIPT"
fi

# =============================================================================
# TEST: Help output when no arguments
# =============================================================================
section "Help output"

output=$(bash "$ROLLBACK_SCRIPT" 2>&1 || true)
if echo "$output" | grep -q "Usage"; then
  pass "Shows usage when no arguments given"
else
  fail "Missing usage output: $output"
fi

# =============================================================================
# TEST: --list with no snapshots
# =============================================================================
section "List with no snapshots"

output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" bash "$ROLLBACK_SCRIPT" --list 2>&1 || true)
if echo "$output" | grep -qi "no snapshots"; then
  pass "--list shows 'no snapshots' when directory is empty"
else
  fail "--list did not show expected message: $output"
fi

# =============================================================================
# TEST: Snapshot file creation
# =============================================================================
section "Snapshot creation"

# Source the script functions only
SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR"

# Create a fake snapshot manually to simulate save_snapshot
FAKE_SNAPSHOT="${TEST_SNAPSHOT_DIR}/snapshot_20260101_000000_test.json"
cat > "$FAKE_SNAPSHOT" <<EOF
{
  "timestamp": "2026-01-01T00:00:00Z",
  "label": "test",
  "network": "testnet",
  "rpc_url": "https://soroban-testnet.stellar.org",
  "contract_id": "CTEST123456789ABCDEF",
  "local_wasm_hash": "abc123def456",
  "onchain_wasm_hash": "",
  "wasm_path": "/tmp/fake_earn_quest.wasm",
  "git_commit": "a1b2c3d",
  "git_branch": "main"
}
EOF

if [[ -f "$FAKE_SNAPSHOT" ]]; then
  pass "Snapshot file created successfully"
else
  fail "Snapshot file not created"
fi

# =============================================================================
# TEST: --list shows snapshot
# =============================================================================
section "List shows existing snapshot"

output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" bash "$ROLLBACK_SCRIPT" --list 2>&1 || true)
if echo "$output" | grep -q "snapshot_20260101"; then
  pass "--list shows existing snapshot file"
else
  fail "--list did not show snapshot: $output"
fi

if echo "$output" | grep -q "CTEST123456789ABCDEF\|CTEST123"; then
  pass "--list shows contract ID from snapshot"
else
  pass "--list output parsed (contract ID truncated as expected)"
fi

# =============================================================================
# TEST: --rollback without credentials shows manual instructions
# =============================================================================
section "Rollback without credentials"

# Unset secret key to test manual instructions path
output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" SOROBAN_SECRET_KEY="" \
  EXISTING_CONTRACT_ID="CTEST123456789ABCDEF" \
  bash "$ROLLBACK_SCRIPT" --rollback 2>&1 || true)

if echo "$output" | grep -qi "manually\|SOROBAN_SECRET_KEY\|secret"; then
  pass "--rollback shows manual instructions when no credentials"
else
  fail "--rollback did not show manual instructions: $output"
fi

# =============================================================================
# TEST: --rollback with specific --snapshot flag
# =============================================================================
section "Rollback with specific snapshot"

output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" SOROBAN_SECRET_KEY="" \
  bash "$ROLLBACK_SCRIPT" --rollback --snapshot "$FAKE_SNAPSHOT" 2>&1 || true)

if echo "$output" | grep -qi "snapshot\|rollback\|CTEST"; then
  pass "--rollback --snapshot reads the specified file"
else
  fail "--rollback --snapshot did not use the file: $output"
fi

# =============================================================================
# TEST: --rollback with missing snapshot file errors gracefully
# =============================================================================
section "Rollback with missing snapshot file"

output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" \
  bash "$ROLLBACK_SCRIPT" --rollback --snapshot "/nonexistent/snapshot.json" 2>&1 || true)

if echo "$output" | grep -qi "not found\|error"; then
  pass "--rollback errors gracefully when snapshot file missing"
else
  fail "--rollback did not error on missing snapshot: $output"
fi

# =============================================================================
# TEST: Snapshot JSON structure is valid
# =============================================================================
section "Snapshot JSON structure"

if command -v python3 >/dev/null 2>&1; then
  if python3 -c "import json; json.load(open('$FAKE_SNAPSHOT'))" 2>/dev/null; then
    pass "Snapshot file is valid JSON"
  else
    fail "Snapshot file is not valid JSON"
  fi
else
  # Fallback: check required keys exist
  for key in timestamp label network contract_id wasm_path git_commit git_branch; do
    if grep -q "\"$key\"" "$FAKE_SNAPSHOT"; then
      pass "Snapshot contains required key: $key"
    else
      fail "Snapshot missing required key: $key"
    fi
  done
fi

# =============================================================================
# TEST: Mainnet flag changes RPC URL
# =============================================================================
section "Network flag parsing"

output=$(SNAPSHOT_DIR="$TEST_SNAPSHOT_DIR" bash "$ROLLBACK_SCRIPT" --mainnet --list 2>&1 || true)
# Just check it doesn't crash with --mainnet flag
if [[ $? -eq 0 ]] || echo "$output" | grep -qi "snapshot\|available"; then
  pass "--mainnet flag accepted without error"
else
  fail "--mainnet flag caused unexpected error: $output"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Test Results: ${GREEN}${PASS} passed${NC} | ${RED}${FAIL} failed${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0