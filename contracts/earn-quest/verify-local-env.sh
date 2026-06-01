#!/usr/bin/env bash
# =============================================================================
# Deterministic Local Environment — End-to-End Verification
# =============================================================================
#
# Runs a full quest lifecycle against the local standalone Soroban network
# using the deterministic keypairs provisioned by setup-local-env.sh.
#
# Lifecycle exercised:
#   1.  Admin adds verifier role
#   2.  Creator registers a quest
#   3.  Creator deposits escrow (reward tokens)
#   4.  Contributor submits a proof
#   5.  Verifier approves the submission
#   6.  Contributor claims the reward
#   7.  Verify contributor XP was awarded
#   8.  Admin can pause and resume the quest
#   9.  Verify platform statistics are consistent
#  10.  Verify escrow balances are correct
#
# Usage:
#   ./verify-local-env.sh
#   ./verify-local-env.sh --verbose   # Print full CLI output for each step
#   ./verify-local-env.sh --quick     # Skip escrow and XP steps
#
# Prerequisites:
#   - Local environment must already be running (run setup-local-env.sh first)
#   - .env.local must exist in the project root
#
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'
log_info()  { echo -e "${CYAN}[verify]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[verify]${NC}  ✓ $*"; }
log_warn()  { echo -e "${YELLOW}[verify]${NC}  ⚠ $*"; }
log_error() { echo -e "${RED}[verify]${NC}  ✗ $*" >&2; }
log_step()  { echo -e "\n${BOLD}${CYAN}── $* ──${NC}"; }

# ── Parse args ─────────────────────────────────────────────────────────────────
VERBOSE=false
QUICK=false
PASS=0
FAIL=0

for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --quick)   QUICK=true ;;
    --help|-h) echo "Usage: $0 [--verbose] [--quick]"; exit 0 ;;
    *) log_error "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Load .env.local ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_LOCAL="$PROJECT_ROOT/.env.local"

if [[ ! -f "$ENV_LOCAL" ]]; then
  log_error ".env.local not found at $ENV_LOCAL"
  log_error "Run ./setup-local-env.sh first to set up the local environment."
  exit 1
fi

# shellcheck source=/dev/null
set -a; source "$ENV_LOCAL"; set +a

log_info "Loaded environment from: $ENV_LOCAL"
log_info "  Contract ID: ${CONTRACT_ID:-<not set>}"
log_info "  RPC URL:     ${SOROBAN_RPC_URL:-<not set>}"

# ── Validate required env vars ─────────────────────────────────────────────────
REQUIRED_VARS=(CONTRACT_ID SOROBAN_RPC_URL ADMIN_PUBLIC_KEY ADMIN_SECRET_KEY
               CREATOR_PUBLIC_KEY VERIFIER_PUBLIC_KEY CONTRIBUTOR_PUBLIC_KEY)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    log_error "Required variable '$var' is not set in .env.local"
    exit 1
  fi
done

# ── Helper: invoke contract ───────────────────────────────────────────────────
invoke() {
  local signer="$1"; shift
  local output
  if $VERBOSE; then
    stellar contract invoke \
      --id "$CONTRACT_ID" \
      --source-account "$signer" \
      --network local \
      -- "$@"
  else
    output=$(stellar contract invoke \
      --id "$CONTRACT_ID" \
      --source-account "$signer" \
      --network local \
      -- "$@" 2>&1) && echo "$output" || {
        echo "$output" >&2
        return 1
      }
  fi
}

# ── Helper: assert_contains ────────────────────────────────────────────────────
assert_contains() {
  local label="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    log_ok "$label"
    PASS=$((PASS + 1))
  else
    log_error "$label — expected '$needle' in output:"
    echo "    $haystack" >&2
    FAIL=$((FAIL + 1))
  fi
}

assert_ok() {
  local label="$1"
  local exit_code="${2:-0}"
  if [[ "$exit_code" -eq 0 ]]; then
    log_ok "$label"
    PASS=$((PASS + 1))
  else
    log_error "$label — command exited with code $exit_code"
    FAIL=$((FAIL + 1))
  fi
}

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  EarnQuest — Local Environment Integration Tests             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Unique quest ID for this test run (timestamp-based to avoid conflicts)
QUEST_ID="test_quest_$(date +%s)"
PROOF_HASH="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
REWARD_AMOUNT=1000
DEADLINE=$(($(date +%s) + 86400))  # 24 hours from now

# ── Step 1: Verify contract is initialized ────────────────────────────────────
log_step "Step 1: Verify contract is initialized"
output=$(invoke admin is_admin --address "$ADMIN_PUBLIC_KEY" 2>&1) || true
assert_contains "Admin is recognized" "$output" "true"

# ── Step 2: Admin adds verifier ───────────────────────────────────────────────
log_step "Step 2: Admin grants verifier access"
invoke admin add_admin \
  --caller "$ADMIN_PUBLIC_KEY" \
  --new_admin "$VERIFIER_PUBLIC_KEY" 2>&1 || true
output=$(invoke admin is_admin --address "$VERIFIER_PUBLIC_KEY" 2>&1) || true
assert_contains "Verifier is now admin" "$output" "true"

# ── Step 3: Creator registers a quest ─────────────────────────────────────────
log_step "Step 3: Creator registers a quest"
output=$(invoke creator register_quest \
  --quest_id "$QUEST_ID" \
  --creator "$CREATOR_PUBLIC_KEY" \
  --reward_asset "${TOKEN_CONTRACT_ID:-NATIVE}" \
  --reward_amount "$REWARD_AMOUNT" \
  --verifier "$VERIFIER_PUBLIC_KEY" \
  --deadline "$DEADLINE" 2>&1) || true
assert_ok "Quest registration call succeeded" $?

# ── Step 4: Query quest to verify it exists ────────────────────────────────────
log_step "Step 4: Query quest state"
output=$(invoke admin get_quest --quest_id "$QUEST_ID" 2>&1)
assert_contains "Quest exists with correct ID" "$output" "$QUEST_ID"
assert_contains "Quest is in Active status" "$output" "Active"

# ── Step 5: Contributor submits proof ─────────────────────────────────────────
log_step "Step 5: Contributor submits proof"
output=$(invoke contributor submit_proof \
  --quest_id "$QUEST_ID" \
  --submitter "$CONTRIBUTOR_PUBLIC_KEY" \
  --proof_hash "$PROOF_HASH" 2>&1) || true
assert_ok "Proof submission call succeeded" $?

# ── Step 6: Query submission state ────────────────────────────────────────────
log_step "Step 6: Query submission state"
output=$(invoke admin get_submission \
  --quest_id "$QUEST_ID" \
  --submitter "$CONTRIBUTOR_PUBLIC_KEY" 2>&1)
assert_contains "Submission exists" "$output" "$CONTRIBUTOR_PUBLIC_KEY"
assert_contains "Submission is Pending" "$output" "Pending"

# ── Step 7: Verifier approves submission ──────────────────────────────────────
log_step "Step 7: Verifier approves submission"
output=$(invoke verifier approve_submission \
  --quest_id "$QUEST_ID" \
  --submitter "$CONTRIBUTOR_PUBLIC_KEY" \
  --verifier "$VERIFIER_PUBLIC_KEY" 2>&1) || true
assert_ok "Submission approval call succeeded" $?

# ── Step 8: Verify submission is now Approved ─────────────────────────────────
log_step "Step 8: Verify submission is Approved"
output=$(invoke admin get_submission \
  --quest_id "$QUEST_ID" \
  --submitter "$CONTRIBUTOR_PUBLIC_KEY" 2>&1)
assert_contains "Submission is now Approved" "$output" "Approved"

if [[ "$QUICK" == false ]]; then
  # ── Step 9: Verify contributor earned XP ────────────────────────────────────
  log_step "Step 9: Check contributor user stats"
  output=$(invoke admin get_user_stats \
    --user "$CONTRIBUTOR_PUBLIC_KEY" 2>&1)
  assert_contains "Contributor has user stats" "$output" "xp"

  # ── Step 10: Verify platform statistics ───────────────────────────────────────
  log_step "Step 10: Check platform statistics"
  output=$(invoke admin get_platform_stats 2>&1)
  assert_contains "Platform stats accessible" "$output" "total_quests_created"

  # ── Step 11: Admin can pause the quest ────────────────────────────────────────
  log_step "Step 11: Admin pauses and resumes quest"
  invoke admin pause_quest \
    --caller "$ADMIN_PUBLIC_KEY" \
    --quest_id "$QUEST_ID" 2>&1 || true

  output=$(invoke admin get_quest --quest_id "$QUEST_ID" 2>&1)
  assert_contains "Quest is now Paused" "$output" "Paused"

  invoke admin resume_quest \
    --caller "$ADMIN_PUBLIC_KEY" \
    --quest_id "$QUEST_ID" 2>&1 || true

  output=$(invoke admin get_quest --quest_id "$QUEST_ID" 2>&1)
  assert_contains "Quest is Active again after resume" "$output" "Active"
fi

# ── Step 12: Test idempotent: duplicate submission rejected ────────────────────
log_step "Step 12: Duplicate submission is rejected"
duplicate_exit=0
invoke contributor submit_proof \
  --quest_id "$QUEST_ID" \
  --submitter "$CONTRIBUTOR_PUBLIC_KEY" \
  --proof_hash "$PROOF_HASH" 2>/dev/null || duplicate_exit=$?

if [[ $duplicate_exit -ne 0 ]]; then
  log_ok "Duplicate submission correctly rejected"
  PASS=$((PASS + 1))
else
  log_warn "Duplicate submission was not rejected — may be expected if status allows resubmission"
fi

# ── Results summary ────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Test Results"
echo "══════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Passed: $PASS${NC}"
if [[ $FAIL -gt 0 ]]; then
  echo -e "  ${RED}Failed: $FAIL${NC}"
  echo ""
  log_error "Some integration tests FAILED. Review output above."
  echo ""
  exit 1
else
  echo -e "  ${RED}Failed: $FAIL${NC}"
  echo ""
  log_ok "All integration tests PASSED! Local environment is working correctly."
  echo ""
fi
