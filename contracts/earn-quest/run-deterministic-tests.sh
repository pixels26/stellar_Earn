#!/usr/bin/env bash
# =============================================================================
# Deterministic Local Environment Test Runner
# =============================================================================
# This script runs the deterministic local environment setup and then executes
# the integration verification tests in a single step. It is intended for use in
# CI pipelines or local development to provide a reproducible test flow.
#
# Usage:
#   ./run-deterministic-tests.sh [options]
# Options are passed through to verify-local-env.sh (e.g., --verbose, --quick).
#   --clean   After tests complete, the script will tear down the local environment.
#   --help    Show this help message.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
CLEAN=false
HELP=false
VERBOSE=false
QUICK=false

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --clean)   CLEAN=true ;;
    --verbose) VERBOSE=true ;;
    --quick)   QUICK=true ;;
    --help|-h) HELP=true ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done

if $HELP; then
  cat <<EOF
$(basename "$0") - Run deterministic local environment setup + verification.

Options:
  --clean    Tear down the local environment after tests.
  --verbose  Pass --verbose to verify-local-env.sh.
  --quick    Pass --quick to verify-local-env.sh.
  --help     Show this help message.
EOF
  exit 0
fi

# Ensure scripts are executable
chmod +x "$SCRIPT_DIR/setup-local-env.sh"
chmod +x "$SCRIPT_DIR/verify-local-env.sh"

# Step 1: Setup deterministic local environment
echo "\n=== Setting up deterministic local environment ==="
"$SCRIPT_DIR/setup-local-env.sh"

# Step 2: Run verification tests
echo "\n=== Running deterministic local environment verification tests ==="
VERBOSITY=""
if $VERBOSE; then VERBOSITY="--verbose"; fi
if $QUICK; then VERBOSITY="$VERBOSITY --quick"; fi
"$SCRIPT_DIR/verify-local-env.sh" $VERBOSITY

# Step 3: Optional clean up
if $CLEAN; then
  echo "\n=== Tearing down deterministic local environment ==="
  "$SCRIPT_DIR/setup-local-env.sh" --clean
fi

exit 0
