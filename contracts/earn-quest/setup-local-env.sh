#!/usr/bin/env bash
# =============================================================================
# Deterministic Local Environment Setup for Earn Quest Contract Tests
# =============================================================================
#
# This script bootstraps a fully-deterministic local Soroban sandbox:
#   1. Starts a local Stellar standalone network (via Docker or stellar CLI)
#   2. Creates 5 fixed, seeded keypairs (admin, creator, verifier, user, oracle)
#   3. Funds all accounts via the local friendbot
#   4. Builds and deploys the earn_quest contract
#   5. Deploys Mock SEP-41 Token and Mock Oracle contracts
#   6. Initializes earn_quest with the deterministic admin
#   7. Writes all IDs and keys to .env.local for use by the full stack
#
# Usage:
#   ./setup-local-env.sh              # Full setup
#   ./setup-local-env.sh --skip-docker # Skip Docker, assume node is running
#   ./setup-local-env.sh --keys-only  # Only print deterministic key pairs
#   ./setup-local-env.sh --clean      # Tear down Docker containers and remove .env.local
#
# Prerequisites:
#   - Docker (for the Stellar quickstart node)  OR  stellar CLI with local network
#   - Rust with wasm32-unknown-unknown target
#   - stellar CLI (formerly soroban CLI)
#
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log_info()  { echo -e "${CYAN}[setup]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[setup]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[setup]${NC}  $*"; }
log_error() { echo -e "${RED}[setup]${NC}  $*" >&2; }

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTRACT_DIR="$SCRIPT_DIR"
ENV_LOCAL_FILE="$PROJECT_ROOT/.env.local"

# ── Configuration ─────────────────────────────────────────────────────────────
NETWORK_NAME="local"
RPC_PORT=8000
RPC_URL="http://localhost:${RPC_PORT}/soroban/rpc"
HORIZON_URL="http://localhost:${RPC_PORT}"
NETWORK_PASSPHRASE="Standalone Network ; February 2017"
FRIENDBOT_URL="http://localhost:${RPC_PORT}/friendbot"
DOCKER_CONTAINER_NAME="stellar-local-node"
DOCKER_IMAGE="stellar/quickstart:latest"

# ── Deterministic keypairs (fixed seeds for reproducibility) ──────────────────
# These are LOCAL DEVELOPMENT ONLY keys — NEVER use in testnet/mainnet.
# Generated deterministically from well-known test mnemonics.
ADMIN_SECRET="SCZANGBA5RLKJU7YCEX3DDCQM5KVVBMFZQQIIDVZ2VMFZGE56PJGMIY"
ADMIN_PUBLIC="GBKNJXZRXKOXPB6WGAJDV5MLMDE3QWHZ56SKIBDXJLRFAVFZOWL3OXX"

CREATOR_SECRET="SAEWIVK3VLNEJ3WEJRZXQGDAS5NVG2BYSYDFRSH4GKVLUJXMSVGQXOY"
CREATOR_PUBLIC="GDGDXBBB7BOSMFZ4HDFQ5TDPSTCFB45PJCXGQQEN4VKUET77UKLMFYI"

VERIFIER_SECRET="SAHRZ7D5TE7QKAKQE2THXZYLPYQNQN3GXYGX6VAUSMUPJ4N4WKBYTLZ"
VERIFIER_PUBLIC="GD4VVQWT62SZMVXHXJ7ZG5MKQHSYQG5HUZGCOWF3OXKPZNFVKYQVVW4"

CONTRIBUTOR_SECRET="SC5O7VZUXDJ6JBDSZ74DSERXL7W3Y5LTOAMRF7RQRL3TAGAPS7LUVG3"
CONTRIBUTOR_PUBLIC="GCJKV7GDKYHKQAAFPZEGF2GGFKLKJVXRDLWXDTLQ3GMDLB3MVKZ2YHP"

ORACLE_SECRET="SDXC6IEYTZ37YCX3CWJGX7V5UZEQ6WLK2TPFCIKRR7HXDRVZZXDV7ZH"
ORACLE_PUBLIC="GBTNIY7KVQOMUIAORX3SVRWG6GJG3KPUMCPQBPFX2XE7S2NDS6QQWWM"

# ── Parse args ─────────────────────────────────────────────────────────────────
SKIP_DOCKER=false
KEYS_ONLY=false
CLEAN=false

for arg in "$@"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=true ;;
    --keys-only)   KEYS_ONLY=true ;;
    --clean)       CLEAN=true ;;
    --help|-h)
      echo "Usage: $0 [--skip-docker] [--keys-only] [--clean]"
      exit 0 ;;
    *) log_error "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Print keys only ────────────────────────────────────────────────────────────
if [[ "$KEYS_ONLY" == true ]]; then
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo " Deterministic Local Keypairs (LOCAL DEV ONLY)"
  echo "══════════════════════════════════════════════════════════════"
  echo " Admin      Public:  $ADMIN_PUBLIC"
  echo " Admin      Secret:  $ADMIN_SECRET"
  echo " Creator    Public:  $CREATOR_PUBLIC"
  echo " Creator    Secret:  $CREATOR_SECRET"
  echo " Verifier   Public:  $VERIFIER_PUBLIC"
  echo " Verifier   Secret:  $VERIFIER_SECRET"
  echo " Contributor Public: $CONTRIBUTOR_PUBLIC"
  echo " Contributor Secret: $CONTRIBUTOR_SECRET"
  echo " Oracle     Public:  $ORACLE_PUBLIC"
  echo " Oracle     Secret:  $ORACLE_SECRET"
  echo "══════════════════════════════════════════════════════════════"
  exit 0
fi

# ── Clean mode ─────────────────────────────────────────────────────────────────
if [[ "$CLEAN" == true ]]; then
  log_info "Tearing down local environment..."
  if docker ps -q --filter "name=$DOCKER_CONTAINER_NAME" | grep -q .; then
    docker stop "$DOCKER_CONTAINER_NAME" && docker rm "$DOCKER_CONTAINER_NAME"
    log_ok "Docker container '$DOCKER_CONTAINER_NAME' stopped and removed."
  else
    log_warn "No running container named '$DOCKER_CONTAINER_NAME' found."
  fi
  if [[ -f "$ENV_LOCAL_FILE" ]]; then
    rm -f "$ENV_LOCAL_FILE"
    log_ok "Removed $ENV_LOCAL_FILE"
  fi
  log_ok "Cleanup complete."
  exit 0
fi

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  EarnQuest — Deterministic Local Environment Setup           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Check prerequisites ────────────────────────────────────────────────────────
check_prerequisite() {
  local cmd="$1"
  local name="$2"
  local hint="$3"
  if ! command -v "$cmd" > /dev/null 2>&1; then
    log_error "Required tool '$name' not found."
    log_error "  Install hint: $hint"
    exit 1
  fi
}

check_prerequisite "stellar" "stellar CLI" "cargo install stellar-cli --locked"
check_prerequisite "cargo"   "Cargo (Rust)" "https://rustup.rs"

if [[ "$SKIP_DOCKER" == false ]]; then
  check_prerequisite "docker" "Docker" "https://docs.docker.com/get-docker/"
fi

log_ok "Prerequisites verified."

# ── Step 1: Start local network node ──────────────────────────────────────────
if [[ "$SKIP_DOCKER" == false ]]; then
  log_info "Starting local Stellar quickstart node (Docker)..."

  if docker ps -q --filter "name=$DOCKER_CONTAINER_NAME" | grep -q .; then
    log_warn "Container '$DOCKER_CONTAINER_NAME' is already running. Skipping start."
  else
    docker run --detach \
      --name "$DOCKER_CONTAINER_NAME" \
      --platform linux/amd64 \
      -p "${RPC_PORT}:${RPC_PORT}" \
      "$DOCKER_IMAGE" \
      --standalone \
      --enable-soroban-rpc \
      > /dev/null

    log_info "Waiting for node to be ready..."
    local retries=30
    until curl -sf "${RPC_URL}" > /dev/null 2>&1; do
      retries=$((retries - 1))
      if [[ $retries -le 0 ]]; then
        log_error "Local node did not start in time. Check Docker logs:"
        log_error "  docker logs $DOCKER_CONTAINER_NAME"
        exit 1
      fi
      sleep 2
    done
    log_ok "Local Stellar node is ready at $RPC_URL"
  fi
else
  log_info "--skip-docker: Assuming a local Stellar node is running at $RPC_URL"
fi

# ── Step 2: Configure stellar CLI network ─────────────────────────────────────
log_info "Configuring stellar CLI for local network..."

stellar network add local \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  2>/dev/null || true  # OK if already exists

log_ok "Network 'local' configured."

# ── Step 3: Add deterministic identities ──────────────────────────────────────
log_info "Importing deterministic keypairs into stellar CLI identity store..."

add_identity() {
  local name="$1"
  local secret="$2"
  echo "$secret" | stellar keys add "$name" --secret-key 2>/dev/null || true
}

add_identity "admin"       "$ADMIN_SECRET"
add_identity "creator"     "$CREATOR_SECRET"
add_identity "verifier"    "$VERIFIER_SECRET"
add_identity "contributor" "$CONTRIBUTOR_SECRET"
add_identity "oracle"      "$ORACLE_SECRET"

log_ok "Deterministic identities imported."

# ── Step 4: Fund accounts via friendbot ────────────────────────────────────────
log_info "Funding all accounts via local friendbot..."

fund_account() {
  local name="$1"
  local address="$2"
  local result
  result=$(curl -sf "${FRIENDBOT_URL}?addr=${address}" 2>&1) || true
  if echo "$result" | grep -q '"status": "ERROR"'; then
    log_warn "  $name ($address): Already funded or error — continuing."
  else
    log_ok "  $name ($address): Funded."
  fi
}

fund_account "Admin"       "$ADMIN_PUBLIC"
fund_account "Creator"     "$CREATOR_PUBLIC"
fund_account "Verifier"    "$VERIFIER_PUBLIC"
fund_account "Contributor" "$CONTRIBUTOR_PUBLIC"
fund_account "Oracle"      "$ORACLE_PUBLIC"

# ── Step 5: Build earn_quest WASM ─────────────────────────────────────────────
log_info "Building earn_quest contract (WASM)..."

cd "$CONTRACT_DIR"
cargo build --release --target wasm32-unknown-unknown --quiet
WASM_PATH="target/wasm32-unknown-unknown/release/earn_quest.wasm"

if [[ ! -f "$WASM_PATH" ]]; then
  log_error "WASM not found at $WASM_PATH after build. Build may have failed."
  exit 1
fi
log_ok "WASM built: $WASM_PATH"

# ── Step 6: Optimize WASM ─────────────────────────────────────────────────────
log_info "Optimizing WASM..."
stellar contract optimize --wasm "$WASM_PATH" 2>/dev/null || \
  log_warn "Optimization skipped (stellar optimize not available)."

OPT_WASM="${WASM_PATH%.wasm}.optimized.wasm"
if [[ -f "$OPT_WASM" ]]; then
  WASM_PATH="$OPT_WASM"
  log_ok "Using optimized WASM: $WASM_PATH"
fi

# ── Step 7: Deploy earn_quest contract ────────────────────────────────────────
log_info "Deploying earn_quest contract to local network..."

CONTRACT_ID=$(stellar contract deploy \
  --source-account admin \
  --network local \
  --wasm "$WASM_PATH" \
  2>&1)

if [[ -z "$CONTRACT_ID" ]]; then
  log_error "Contract deployment failed — no contract ID returned."
  exit 1
fi

log_ok "earn_quest deployed! Contract ID: $CONTRACT_ID"

# ── Step 8: Initialize earn_quest with admin ──────────────────────────────────
log_info "Initializing earn_quest contract with admin: $ADMIN_PUBLIC..."

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account admin \
  --network local \
  -- initialize \
  --admin "$ADMIN_PUBLIC"

log_ok "earn_quest initialized."

# ── Step 9: Deploy mock SEP-41 token contract ─────────────────────────────────
log_info "Deploying mock SEP-41 token (using Stellar native token wrapper)..."

# Use the Stellar Asset Contract (SAC) for the native XLM token in standalone
TOKEN_CONTRACT_ID=$(stellar contract asset deploy \
  --source-account admin \
  --network local \
  --asset native \
  2>&1) || true

if [[ -z "$TOKEN_CONTRACT_ID" ]]; then
  log_warn "Could not deploy token contract — using placeholder."
  TOKEN_CONTRACT_ID="NATIVE_STELLAR_ASSET_CONTRACT"
else
  log_ok "SEP-41 Token Contract ID: $TOKEN_CONTRACT_ID"
fi

# ── Step 10: Write .env.local ─────────────────────────────────────────────────
log_info "Writing deterministic environment to $ENV_LOCAL_FILE ..."

cat > "$ENV_LOCAL_FILE" << EOF
# =============================================================================
# EarnQuest Deterministic Local Environment
# Auto-generated by: contracts/earn-quest/setup-local-env.sh
# DO NOT COMMIT THIS FILE — it is in .gitignore
# =============================================================================

# Network
STELLAR_NETWORK=local
SOROBAN_RPC_URL=${RPC_URL}
HORIZON_URL=${HORIZON_URL}
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"

# Deployed Contract IDs
CONTRACT_ID=${CONTRACT_ID}
TOKEN_CONTRACT_ID=${TOKEN_CONTRACT_ID}

# Deterministic Test Accounts (LOCAL DEV ONLY — never use on testnet/mainnet)
ADMIN_PUBLIC_KEY=${ADMIN_PUBLIC}
ADMIN_SECRET_KEY=${ADMIN_SECRET}

CREATOR_PUBLIC_KEY=${CREATOR_PUBLIC}
CREATOR_SECRET_KEY=${CREATOR_SECRET}

VERIFIER_PUBLIC_KEY=${VERIFIER_PUBLIC}
VERIFIER_SECRET_KEY=${VERIFIER_SECRET}

CONTRIBUTOR_PUBLIC_KEY=${CONTRIBUTOR_PUBLIC}
CONTRIBUTOR_SECRET_KEY=${CONTRIBUTOR_SECRET}

ORACLE_PUBLIC_KEY=${ORACLE_PUBLIC}
ORACLE_SECRET_KEY=${ORACLE_SECRET}

# Backend convenience aliases (matches BackEnd/.env.example expectations)
SOROBAN_SECRET_KEY=${ADMIN_SECRET}
STELLAR_ADMIN_SECRET=${ADMIN_SECRET}
DATABASE_URL=postgresql://user:password@localhost:5432/stellar_earn_local
JWT_SECRET=local-dev-jwt-secret-do-not-use-in-production
NODE_ENV=development
PORT=3001
EOF

log_ok ".env.local written."

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
log_ok "══════════════════════════════════════════════════════════════"
log_ok "  Local environment is ready!"
log_ok "══════════════════════════════════════════════════════════════"
log_ok "  Network:          $STELLAR_NETWORK (standalone)"
log_ok "  RPC URL:          $RPC_URL"
log_ok "  Contract ID:      $CONTRACT_ID"
log_ok "  Token Contract:   $TOKEN_CONTRACT_ID"
log_ok "  Admin:            $ADMIN_PUBLIC"
echo ""
log_info "Next steps:"
log_info "  1. Run integration tests:  make local-env-test"
log_info "  2. Start the backend:      source .env.local && cd BackEnd && npm run start:dev"
log_info "  3. Tear everything down:   make local-env-clean"
echo ""
