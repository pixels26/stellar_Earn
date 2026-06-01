CRATE := earn-quest
WASM := $(shell ls target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null | head -n1)
NETWORK ?= testnet

.PHONY: help test test-verbose test-fast build fmt clippy deploy invoke-register \
license-check deny-check migration-dry-run migration-apply \
snapshots snapshots-clean snapshots-verify snapshots-restore snapshots-backup \
snapshots-stats snapshots-admin snapshots-quest snapshots-payout snapshots-security \
local-env-setup local-env-test local-env-clean \
clean clean-all install-hooks check-hooks remove-hooks

# Default target
help:
	@echo "Earn Quest Contract - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "Building & Testing:"
	@echo "  make build               - Build the contract for wasm32"
	@echo "  make test                - Run all tests"
	@echo "  make test-verbose        - Run tests with verbose output"
	@echo "  make test-fast           - Run fast unit tests only (same as pre-commit hook)"
	@echo "  make fmt                 - Format code with cargo fmt"
	@echo "  make clippy              - Run linter (clippy)"
	@echo "  make license-check       - Run cargo-deny license checks"
	@echo "  make deny-check          - Run cargo-deny advisory and license checks"
	@echo ""
	@echo "Git Hooks:"
	@echo "  make install-hooks       - Install pre-commit hooks into .git/hooks/"
	@echo "  make check-hooks         - Verify hooks are installed"
	@echo "  make remove-hooks        - Uninstall project hooks"
	@echo ""
	@echo "Stellar / Soroban Deployment & Interaction:"
	@echo "  make deploy              - Deploy the compiled WASM to the network"
	@echo "  make invoke-register     - Invoke register_task function on deployed contract"
	@echo ""

	@echo "Local Deterministic Environment:"
	@echo "  make local-env-setup     - Start sandbox, deploy contracts, write .env.local"
	@echo "  make local-env-test      - Run end-to-end integration tests against local sandbox"
	@echo "  make local-env-clean     - Stop sandbox Docker container and remove .env.local"
	@echo "  make local-env-setup SKIP_DOCKER=1  - Skip Docker (assume node already running)"
	@echo "  make local-env-test QUICK=1         - Run abbreviated test suite"
	@echo "  make local-env-test VERBOSE=1       - Show full CLI output for each step"
	@echo ""

	@echo "Migration & Snapshots:"
	@echo "  make migration-dry-run   - Preview schema migration for STATE=<path>"
	@echo "  make migration-apply     - Write migrated schema to OUTPUT=<path>"
	@echo "  make snapshots           - Update all snapshots (with backup)"
	@echo "  make snapshots-clean     - Clean and regenerate all snapshots"
	@echo "  make snapshots-verify    - Verify current snapshots"
	@echo "  make snapshots-restore   - Restore from last backup"
	@echo "  make snapshots-backup    - Create manual backup"
	@echo "  make snapshots-stats     - Show snapshot statistics"
	@echo ""
	@echo "Specific Test Snapshots:"
	@echo "  make snapshots-admin     - Update admin test snapshots"
	@echo "  make snapshots-quest     - Update quest test snapshots"
	@echo "  make snapshots-payout    - Update payout test snapshots"
	@echo "  make snapshots-security  - Update security test snapshots"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean               - Clean build artifacts"
	@echo "  make clean-all           - Clean everything including snapshots"

# Build the contract
build:
	@echo "Building contract..."
	cargo build --release --target wasm32-unknown-unknown

# Generate provenance attestation for the built WASM artifact
provenance: build
	@echo "Generating provenance attestation for WASM artifact..."
	node scripts/generate-provenance.js

# Validate the generated provenance attestation
check-provenance:
	@echo "Validating provenance attestation..."
	node scripts/check-provenance.js

# Run tests
test:
	@echo "Running tests..."
	cargo test

# Run tests with verbose output
test-verbose:
	@echo "Running tests (verbose)..."
	cargo test -- --nocapture

# Format source code
fmt:
	@echo "Formatting code..."
	cargo fmt

# Run fast unit tests only (lib crate, no integration tests — matches pre-commit hook)
test-fast:
	@echo "Running fast unit tests..."
	cargo test --lib

# Run code compliance checks
clippy:
	@echo "Running clippy linter..."
	cargo clippy --all-targets --all-features -- -D warnings

# ── Git hooks ─────────────────────────────────────────────────────────────────

# Install pre-commit hooks into .git/hooks/
install-hooks:
	@echo "Installing git hooks..."
	@bash ../../scripts/install-hooks.sh
	@echo "Done. Hooks will run automatically on 'git commit'."

# Verify hooks are installed
check-hooks:
	@bash ../../scripts/install-hooks.sh --check

# Remove project hooks from .git/hooks/
remove-hooks:
	@bash ../../scripts/install-hooks.sh --remove

# Deploy contract to Stellar network
deploy:
	ifndef SOROBAN_SECRET_KEY
		$(error SOROBAN_SECRET_KEY is not set)
	endif
	@echo "Deploying contract to $(NETWORK)..."
	@soroban contract deploy --wasm $(WASM) --network $(NETWORK) --secret-key $(SOROBAN_SECRET_KEY) --rpc-url $(SOROBAN_RPC_URL)

# Invoke test task configuration
invoke-register:
	@echo "Invoking register_task..."
	@soroban contract invoke --id $(CONTRACT_ID) --fn register_task --arg id=Q-001 --arg reward_asset=... --arg amount=100 --rpc-url $(SOROBAN_RPC_URL)

# Run cargo-deny license policy checks
license-check:
	@echo "Running cargo-deny license checks..."
	cargo deny check licenses

# Run cargo-deny policy checks used by CI
deny-check:
	@echo "Running cargo-deny advisory and license checks..."
	cargo deny check advisories licenses

# Preview a storage snapshot migration without writing changes
migration-dry-run:
	@if [ -z "$(STATE)" ]; then echo "STATE=<path> is required"; exit 1; fi
	node ../../scripts/deploy/migrate-contract-storage.mjs --input "$(STATE)" --dry-run

# Apply a storage snapshot migration and write the migrated output
migration-apply:
	@if [ -z "$(STATE)" ]; then echo "STATE=<path> is required"; exit 1; fi
	@if [ -z "$(OUTPUT)" ]; then echo "OUTPUT=<path> is required"; exit 1; fi
	node ../../scripts/deploy/migrate-contract-storage.mjs --input "$(STATE)" --output "$(OUTPUT)" --write

# Update all snapshots with backup
snapshots:
	@./update-snapshots.sh

# Clean and regenerate all snapshots
snapshots-clean:
	@./update-snapshots.sh --clean

# Verify current snapshots
snapshots-verify:
	@./update-snapshots.sh --verify

# Restore snapshots from backup
snapshots-restore:
	@./update-snapshots.sh --restore

# Create manual backup
snapshots-backup:
	@./update-snapshots.sh --backup
	@echo "Backup created. Run 'make snapshots-restore' to restore if needed."

# Show snapshot statistics
snapshots-stats:
	@echo "Snapshot Statistics:"
	@echo "==================="
	@if [ -d "test_snapshots" ]; then \
		echo "Total snapshots: $$(find test_snapshots -name '*.json' | wc -l)"; \
		echo "Total size: $$(du -sh test_snapshots | cut -f1)"; \
		echo "Location: test_snapshots/"; \
		echo ""; \
		echo "Backups:"; \
		ls -lht test_snapshots_backup_* 2>/dev/null | head -5 || echo "  No backups found"; \
	else \
		echo "No snapshot directory found."; \
	fi

# Update specific test snapshots
snapshots-admin:
	@./update-snapshots.sh --test test_admin

snapshots-quest:
	@./update-snapshots.sh --test test_quest

snapshots-payout:
	@./update-snapshots.sh --test test_payout

snapshots-security:
	@./update-snapshots.sh --test test_security

snapshots-pause:
	@./update-snapshots.sh --test test_pause

snapshots-batch:
	@./update-snapshots.sh --test test_batch

snapshots-bounds:
	@./update-snapshots.sh --test test_bounds

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cargo clean

# Clean everything including snapshots and backups
clean-all: clean
	@echo "Cleaning snapshots and backups..."
	@rm -rf test_snapshots_backup_*
	@echo "Done!"

# ── Deterministic Local Environment ──────────────────────────────────────────

# Start the local Stellar standalone network, deploy contracts,
# and write deterministic keypairs + IDs to .env.local
local-env-setup:
	@echo "Setting up deterministic local environment..."
	@chmod +x ./setup-local-env.sh
	@if [ "$(SKIP_DOCKER)" = "1" ]; then \
		./setup-local-env.sh --skip-docker; \
	else \
		./setup-local-env.sh; \
	fi

# Run end-to-end integration tests against the local sandbox
local-env-test:
	@echo "Running deterministic local environment tests..."
	@chmod +x ./run-deterministic-tests.sh
	@FLAGS=""
	@if [ "$(VERBOSE)" = "1" ]; then FLAGS="$$FLAGS --verbose"; fi; \
	if [ "$(QUICK)" = "1" ]; then FLAGS="$$FLAGS --quick"; fi; \
	./run-deterministic-tests.sh $$FLAGS

# Stop local network Docker container and remove .env.local
local-env-clean:
	@echo "Tearing down local environment..."
	@chmod +x ./setup-local-env.sh
	@./setup-local-env.sh --clean
