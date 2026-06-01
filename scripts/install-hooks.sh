#!/usr/bin/env bash
# Installs the project's git hooks from .githooks/ into .git/hooks/.
#
# Usage:
#   bash scripts/install-hooks.sh          # install all hooks
#   bash scripts/install-hooks.sh --check  # verify hooks are installed
#   bash scripts/install-hooks.sh --remove # uninstall project hooks

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info() { echo -e "${CYAN}[install-hooks]${RESET} $*"; }
ok()   { echo -e "${GREEN}[install-hooks] ✓${RESET} $*"; }
warn() { echo -e "${YELLOW}[install-hooks] ⚠${RESET} $*"; }
fail() { echo -e "${RED}[install-hooks] ✗${RESET} $*" >&2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$REPO_ROOT/.githooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

if [[ ! -d "$HOOKS_SRC" ]]; then
  fail "No .githooks/ directory found at $HOOKS_SRC"
  exit 1
fi

if [[ ! -d "$HOOKS_DST" ]]; then
  fail ".git/hooks/ directory not found — are you inside a git repository?"
  exit 1
fi

# ── --check: verify hooks are installed ───────────────────────────────────────
if [[ "${1:-}" == "--check" ]]; then
  ALL_OK=1
  for src in "$HOOKS_SRC"/*; do
    name="$(basename "$src")"
    dst="$HOOKS_DST/$name"
    if [[ -x "$dst" ]]; then
      ok "$name is installed."
    else
      warn "$name is NOT installed. Run: bash scripts/install-hooks.sh"
      ALL_OK=0
    fi
  done
  exit $((1 - ALL_OK))
fi

# ── --remove: uninstall project hooks ─────────────────────────────────────────
if [[ "${1:-}" == "--remove" ]]; then
  for src in "$HOOKS_SRC"/*; do
    name="$(basename "$src")"
    dst="$HOOKS_DST/$name"
    if [[ -f "$dst" ]]; then
      rm "$dst"
      ok "Removed $name."
    fi
  done
  exit 0
fi

# ── Default: install hooks ─────────────────────────────────────────────────────
INSTALLED=0
for src in "$HOOKS_SRC"/*; do
  name="$(basename "$src")"
  dst="$HOOKS_DST/$name"

  # Back up any existing hook that we didn't install
  if [[ -f "$dst" ]] && ! diff -q "$src" "$dst" &>/dev/null; then
    backup="${dst}.bak.$(date +%s)"
    warn "$name already exists — backing up to $(basename "$backup")"
    cp "$dst" "$backup"
  fi

  cp "$src" "$dst"
  chmod +x "$dst"
  ok "Installed $name"
  INSTALLED=$((INSTALLED + 1))
done

echo ""
if [[ "$INSTALLED" -eq 0 ]]; then
  warn "No hook files found in .githooks/ — nothing installed."
else
  ok "Installed $INSTALLED hook(s). They will run automatically on 'git commit'."
  echo ""
  echo -e "  To skip contract checks: ${BOLD}SKIP_CONTRACT_HOOKS=1 git commit${RESET}"
  echo -e "  To skip JS/TS checks:    ${BOLD}SKIP_LINT_STAGED=1 git commit${RESET}"
  echo -e "  To skip all checks:      ${BOLD}SKIP_PRE_COMMIT_HOOKS=1 git commit${RESET}"
  echo -e "  To uninstall:            ${BOLD}bash scripts/install-hooks.sh --remove${RESET}"
fi
