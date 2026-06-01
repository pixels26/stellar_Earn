#!/usr/bin/env bash
# validate-env-parity.sh
# Checks that every key in .env.example is present in the target .env file.
# Usage: ./scripts/validate-env-parity.sh <env_example> <env_file>
# Exit codes: 0 = ok, 1 = missing keys, 2 = usage error

set -euo pipefail

ENV_EXAMPLE="${1:-}"
ENV_FILE="${2:-}"

if [[ -z "$ENV_EXAMPLE" || -z "$ENV_FILE" ]]; then
  echo "Usage: $0 <env_example> <env_file>" >&2
  exit 2
fi

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  echo "ERROR: .env.example not found: $ENV_EXAMPLE" >&2
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env file not found: $ENV_FILE" >&2
  exit 1
fi

# Extract keys: non-empty lines that are not comments
extract_keys() {
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$1" | cut -d'=' -f1
}

EXAMPLE_KEYS=$(extract_keys "$ENV_EXAMPLE")
ENV_KEYS=$(extract_keys "$ENV_FILE")

MISSING=()
while IFS= read -r key; do
  if ! echo "$ENV_KEYS" | grep -qx "$key"; then
    MISSING+=("$key")
  fi
done <<< "$EXAMPLE_KEYS"

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "FAIL: The following keys from $ENV_EXAMPLE are missing in $ENV_FILE:"
  for k in "${MISSING[@]}"; do
    echo "  - $k"
  done
  exit 1
fi

echo "OK: $ENV_FILE contains all keys from $ENV_EXAMPLE"
