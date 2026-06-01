#!/usr/bin/env bash
# =============================================================================
# Soroban Contract Rollback Strategy Script
# =============================================================================
# Provides rollback capability for failed upgrade deployments.
#
# Usage:
#   ./rollback-contract.sh --list                        # List saved snapshots
#   ./rollback-contract.sh --rollback                    # Rollback to last snapshot
#   ./rollback-contract.sh --rollback --snapshot <file>  # Rollback to specific snapshot
#   ./rollback-contract.sh --snapshot-only               # Save current state only
#   ./rollback-contract.sh --verify                      # Verify current deployment
#
# Environment Variables:
#   SOROBAN_SECRET_KEY     - Stellar secret key for signing transactions
#   EXISTING_CONTRACT_ID   - The contract ID to upgrade/rollback
#   SOROBAN_RPC_URL        - RPC endpoint (default: testnet)
#
# How Rollback Works:
#   1. Before any upgrade, a snapshot of the current WASM hash + contract ID is saved
#   2. If upgrade fails or produces unexpected behavior, run this script
#   3. Script redeploys the previous WASM and reinvokes upgrade on the contract
#   4. Contract state is preserved (only code changes, not storage)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONTRACT_DIR="${PROJECT_ROOT}/contracts/earn-quest"
SNAPSHOT_DIR="${SCRIPT_DIR}/.snapshots"

# -- Defaults -----------------------------------------------------------------

LIST_SNAPSHOTS=false
DO_ROLLBACK=false
SNAPSHOT_ONLY=false
VERIFY_ONLY=false
SNAPSHOT_FILE=""
NETWORK="testnet"
SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
HORIZON_URL="https://horizon-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# -- Colors -------------------------------------------------------------------

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${CYAN}[Rollback]${NC} $*"; }
ok()      { echo -e "${GREEN}[Rollback]${NC} $*"; }
warn()    { echo -e "${YELLOW}[Rollback]${NC} $*"; }
error()   { echo -e "${RED}[Rollback]${NC} $*"; exit 1; }
section() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $*${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# -- Argument Parsing ---------------------------------------------------------

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)           LIST_SNAPSHOTS=true; shift ;;
    --rollback)       DO_ROLLBACK=true; shift ;;
    --snapshot-only)  SNAPSHOT_ONLY=true; shift ;;
    --verify)         VERIFY_ONLY=true; shift ;;
    --snapshot)       SNAPSHOT_FILE="$2"; shift 2 ;;
    --testnet)
      NETWORK="testnet"
      SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
      HORIZON_URL="https://horizon-testnet.stellar.org"
      NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
      shift ;;
    --mainnet)
      NETWORK="mainnet"
      SOROBAN_RPC_URL="https://soroban-mainnet.stellar.org"
      HORIZON_URL="https://horizon-mainnet.stellar.org"
      NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
      shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# -- Snapshot Directory -------------------------------------------------------

mkdir -p "$SNAPSHOT_DIR"

# =============================================================================
# FUNCTION: save_snapshot
# Saves the current deployment state before an upgrade so we can roll back.
# Called automatically by deploy-contract.sh before every --upgrade.
# =============================================================================
save_snapshot() {
  local contract_id="${1:-${EXISTING_CONTRACT_ID:-}}"
  local wasm_path="${2:-}"
  local label="${3:-manual}"

  if [[ -z "$contract_id" ]]; then
    warn "No contract ID provided — snapshot skipped"
    return 0
  fi

  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local snapshot_file="${SNAPSHOT_DIR}/snapshot_${timestamp}_${label}.json"

  local wasm_hash=""
  if [[ -n "$wasm_path" ]] && [[ -f "$wasm_path" ]]; then
    wasm_hash=$(sha256sum "$wasm_path" | cut -d' ' -f1)
  fi

  # Try to fetch current on-chain WASM hash if soroban CLI available
  local onchain_hash=""
  if command -v soroban >/dev/null 2>&1 && [[ -n "${SOROBAN_SECRET_KEY:-}" ]]; then
    onchain_hash=$(soroban contract info \
      --id "$contract_id" \
      --rpc-url "$SOROBAN_RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      2>/dev/null | grep -i "wasm_hash\|hash" | head -1 | awk '{print $NF}' || echo "")
  fi

  # Write snapshot JSON
  cat > "$snapshot_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "label": "$label",
  "network": "$NETWORK",
  "rpc_url": "$SOROBAN_RPC_URL",
  "contract_id": "$contract_id",
  "local_wasm_hash": "$wasm_hash",
  "onchain_wasm_hash": "$onchain_hash",
  "wasm_path": "$wasm_path",
  "git_commit": "$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

  ok "Snapshot saved: $snapshot_file"
  echo "$snapshot_file"
}

# =============================================================================
# FUNCTION: list_snapshots
# Lists all saved snapshots with their key info.
# =============================================================================
list_snapshots() {
  section "Available Snapshots"

  local snapshots=("$SNAPSHOT_DIR"/snapshot_*.json)

  if [[ ! -e "${snapshots[0]}" ]]; then
    warn "No snapshots found in $SNAPSHOT_DIR"
    info "Snapshots are created automatically before each --upgrade"
    info "Or create one manually: ./rollback-contract.sh --snapshot-only"
    return 0
  fi

  echo -e "  $(printf '%-30s %-20s %-20s %s\n' 'SNAPSHOT FILE' 'TIMESTAMP' 'CONTRACT ID' 'LABEL')"
  echo -e "  $(printf '%-30s %-20s %-20s %s\n' '─────────────' '─────────' '───────────' '─────')"

  for f in "${snapshots[@]}"; do
    local fname
    fname=$(basename "$f")
    local ts contract_id label
    ts=$(grep '"timestamp"' "$f" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    contract_id=$(grep '"contract_id"' "$f" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    label=$(grep '"label"' "$f" | cut -d'"' -f4 2>/dev/null || echo "unknown")
    short_id="${contract_id:0:12}..."
    echo -e "  $(printf '%-30s %-20s %-20s %s\n' "$fname" "$ts" "$short_id" "$label")"
  done

  echo ""
  local latest
  latest=$(ls -t "$SNAPSHOT_DIR"/snapshot_*.json 2>/dev/null | head -1)
  if [[ -n "$latest" ]]; then
    ok "Latest snapshot: $(basename "$latest")"
  fi
}

# =============================================================================
# FUNCTION: get_latest_snapshot
# Returns the path to the most recent snapshot file.
# =============================================================================
get_latest_snapshot() {
  local latest
  latest=$(ls -t "$SNAPSHOT_DIR"/snapshot_*.json 2>/dev/null | head -1)
  if [[ -z "$latest" ]]; then
    error "No snapshots found. Cannot rollback without a prior snapshot."
  fi
  echo "$latest"
}

# =============================================================================
# FUNCTION: verify_deployment
# Checks the current on-chain state of a contract.
# =============================================================================
verify_deployment() {
  local contract_id="${1:-${EXISTING_CONTRACT_ID:-}}"

  if [[ -z "$contract_id" ]]; then
    error "EXISTING_CONTRACT_ID not set. Cannot verify."
  fi

  section "Verifying Deployment"
  info "Contract ID: $contract_id"
  info "Network:     $NETWORK"
  info "RPC:         $SOROBAN_RPC_URL"

  if ! command -v soroban >/dev/null 2>&1; then
    warn "soroban CLI not found — cannot verify on-chain state"
    return 0
  fi

  # Try to invoke a read-only function to confirm contract is responsive
  info "Pinging contract (get_platform_stats)..."
  if soroban contract invoke \
    --id "$contract_id" \
    --rpc-url "$SOROBAN_RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --source-account "${SOROBAN_SECRET_KEY:-}" \
    -- get_platform_stats \
    >/dev/null 2>&1; then
    ok "Contract is responsive ✓"
  else
    warn "Contract ping failed — contract may be paused or not initialized"
  fi
}

# =============================================================================
# FUNCTION: perform_rollback
# Core rollback logic: redeploys the previous WASM to the existing contract.
# =============================================================================
perform_rollback() {
  local snapshot_file="${1:-}"

  # Use provided snapshot or find latest
  if [[ -z "$snapshot_file" ]]; then
    snapshot_file=$(get_latest_snapshot)
  fi

  if [[ ! -f "$snapshot_file" ]]; then
    error "Snapshot file not found: $snapshot_file"
  fi

  section "Contract Rollback"
  info "Using snapshot: $(basename "$snapshot_file")"

  # Parse snapshot
  local contract_id wasm_path git_commit network_snap
  contract_id=$(grep '"contract_id"' "$snapshot_file" | cut -d'"' -f4)
  wasm_path=$(grep '"wasm_path"' "$snapshot_file"    | cut -d'"' -f4)
  git_commit=$(grep '"git_commit"' "$snapshot_file"  | cut -d'"' -f4)
  network_snap=$(grep '"network"' "$snapshot_file"   | cut -d'"' -f4)

  info "Rolling back contract: $contract_id"
  info "Previous git commit:   $git_commit"
  info "Snapshot network:      $network_snap"

  # Safety check — warn if rolling back on mainnet
  if [[ "$NETWORK" == "mainnet" ]]; then
    warn "⚠️  You are rolling back on MAINNET. This is irreversible."
    read -r -p "  Type 'yes' to confirm mainnet rollback: " confirm
    if [[ "$confirm" != "yes" ]]; then
      error "Mainnet rollback cancelled."
    fi
  fi

  # Validate WASM exists
  if [[ -z "$wasm_path" ]] || [[ ! -f "$wasm_path" ]]; then
    warn "WASM file from snapshot not found at: $wasm_path"
    warn "Attempting to rebuild from saved git commit: $git_commit"

    # Try to checkout the previous commit and rebuild
    if git -C "$PROJECT_ROOT" cat-file -e "${git_commit}^{commit}" 2>/dev/null; then
      info "Checking out $git_commit to rebuild WASM..."
      git -C "$PROJECT_ROOT" stash 2>/dev/null || true
      git -C "$PROJECT_ROOT" checkout "$git_commit" -- contracts/
      
      info "Rebuilding WASM from commit $git_commit..."
      cd "$CONTRACT_DIR"
      cargo build --release --target wasm32-unknown-unknown

      wasm_path="${CONTRACT_DIR}/target/wasm32-unknown-unknown/release/earn_quest.wasm"
      
      # Restore current state
      git -C "$PROJECT_ROOT" checkout HEAD -- contracts/
      git -C "$PROJECT_ROOT" stash pop 2>/dev/null || true
    else
      error "Cannot find previous WASM or rebuild from git history. Manual rollback required."
    fi
  fi

  if [[ ! -f "$wasm_path" ]]; then
    error "WASM file still not found after rebuild attempt: $wasm_path"
  fi

  local wasm_hash
  wasm_hash=$(sha256sum "$wasm_path" | cut -d' ' -f1)
  info "Previous WASM hash: $wasm_hash"

  # Check credentials
  if [[ -z "${SOROBAN_SECRET_KEY:-}" ]]; then
    warn "SOROBAN_SECRET_KEY not set"
    warn "To complete rollback manually, run:"
    echo ""
    echo "  soroban contract upload \\"
    echo "    --source-account \$SOROBAN_SECRET_KEY \\"
    echo "    --rpc-url $SOROBAN_RPC_URL \\"
    echo "    --network-passphrase \"$NETWORK_PASSPHRASE\" \\"
    echo "    --wasm $wasm_path"
    echo ""
    echo "  # Then upgrade contract to the returned WASM hash:"
    echo "  soroban contract invoke \\"
    echo "    --id $contract_id \\"
    echo "    --source-account \$SOROBAN_SECRET_KEY \\"
    echo "    --rpc-url $SOROBAN_RPC_URL \\"
    echo "    --network-passphrase \"$NETWORK_PASSPHRASE\" \\"
    echo "    -- upgrade --new_wasm_hash <HASH_FROM_UPLOAD>"
    echo ""
    exit 0
  fi

  # Step 1: Upload previous WASM to network
  info "Step 1/3 — Uploading previous WASM to network..."
  local prev_wasm_hash
  prev_wasm_hash=$(soroban contract upload \
    --source-account "$SOROBAN_SECRET_KEY" \
    --rpc-url "$SOROBAN_RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    --wasm "$wasm_path" \
    2>&1)

  if [[ -z "$prev_wasm_hash" ]]; then
    error "Failed to upload previous WASM to network"
  fi
  ok "Previous WASM uploaded. Hash: $prev_wasm_hash"

  # Step 2: Invoke upgrade on contract with previous WASM hash
  info "Step 2/3 — Invoking upgrade with previous WASM hash..."
  if soroban contract invoke \
    --id "$contract_id" \
    --source-account "$SOROBAN_SECRET_KEY" \
    --rpc-url "$SOROBAN_RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- upgrade \
    --new_wasm_hash "$prev_wasm_hash" \
    2>/dev/null; then
    ok "Contract code rolled back to previous WASM ✓"
  else
    error "Rollback invoke failed. The contract may require admin auth for upgrades."
  fi

  # Step 3: Verify rollback
  info "Step 3/3 — Verifying rollback..."
  verify_deployment "$contract_id"

  # Save rollback event as a snapshot
  save_snapshot "$contract_id" "$wasm_path" "post-rollback" >/dev/null

  section "Rollback Complete"
  ok "Contract $contract_id has been rolled back successfully"
  ok "Previous WASM hash: $prev_wasm_hash"
  ok "Network: $NETWORK"
  echo ""
  warn "Next steps:"
  echo "  1. Investigate why the upgrade failed"
  echo "  2. Fix the issue in the contract code"
  echo "  3. Run tests: cd contracts/earn-quest && cargo test"
  echo "  4. Re-deploy when ready: ./deploy-contract.sh --upgrade"
}

# =============================================================================
# MAIN
# =============================================================================

section "EarnQuest Contract Rollback Manager"

if [[ "$LIST_SNAPSHOTS" == true ]]; then
  list_snapshots
  exit 0
fi

if [[ "$VERIFY_ONLY" == true ]]; then
  verify_deployment "${EXISTING_CONTRACT_ID:-}"
  exit 0
fi

if [[ "$SNAPSHOT_ONLY" == true ]]; then
  info "Saving current deployment snapshot..."
  WASM_PATH="${CONTRACT_DIR}/target/wasm32-unknown-unknown/release/earn_quest.optimized.wasm"
  if [[ ! -f "$WASM_PATH" ]]; then
    WASM_PATH="${CONTRACT_DIR}/target/wasm32-unknown-unknown/release/earn_quest.wasm"
  fi
  save_snapshot "${EXISTING_CONTRACT_ID:-}" "$WASM_PATH" "manual"
  exit 0
fi

if [[ "$DO_ROLLBACK" == true ]]; then
  perform_rollback "$SNAPSHOT_FILE"
  exit 0
fi

# Default: show help
echo ""
echo "  Usage:"
echo "    ./rollback-contract.sh --list                        List all saved snapshots"
echo "    ./rollback-contract.sh --snapshot-only               Save current state as snapshot"
echo "    ./rollback-contract.sh --rollback                    Rollback to latest snapshot"
echo "    ./rollback-contract.sh --rollback --snapshot <file>  Rollback to specific snapshot"
echo "    ./rollback-contract.sh --verify                      Verify current deployment"
echo ""
echo "  Network flags (optional, default: testnet):"
echo "    --testnet    Target Stellar testnet"
echo "    --mainnet    Target Stellar mainnet (requires confirmation)"
echo ""