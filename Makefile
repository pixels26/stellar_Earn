# =============================================================================
# StellarEarn Backend — Makefile
# Shortcut runner for common NestJS/Prisma/Docker backend workflows
# Usage: make <target>
# =============================================================================

# ── Configuration ─────────────────────────────────────────────────────────────
SHELL        := /bin/bash
.DEFAULT_GOAL := help

# Package manager (override: make install PM=npm)
PM           ?= pnpm

# Docker Compose file
DC           := docker compose -f infra/docker-compose.yml

# Colors for pretty output
CYAN  := \033[0;36m
GREEN := \033[0;32m
YELLOW:= \033[0;33m
RESET := \033[0m

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "  $(CYAN)StellarEarn — Backend Task Runner$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_\-]+:.*##/ \
		{ printf "  $(GREEN)%-22s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ── Installation ──────────────────────────────────────────────────────────────
.PHONY: install
install: ## Install all backend dependencies
	cd apps/api && $(PM) install

.PHONY: install-ci
install-ci: ## Install dependencies in frozen/CI mode (no lockfile updates)
	cd apps/api && $(PM) install --frozen-lockfile

# ── Development ───────────────────────────────────────────────────────────────
.PHONY: dev
dev: ## Start the backend in watch/dev mode
	cd apps/api && $(PM) run start:dev

.PHONY: start
start: ## Start the backend in production mode
	cd apps/api && $(PM) run start:prod

.PHONY: build
build: ## Compile TypeScript → dist/
	cd apps/api && $(PM) run build

.PHONY: build-watch
build-watch: ## Compile in watch mode
	cd apps/api && $(PM) run build -- --watch

# ── Database ──────────────────────────────────────────────────────────────────
.PHONY: db-up
db-up: ## Start Postgres via Docker Compose
	$(DC) up -d postgres

.PHONY: db-down
db-down: ## Stop Postgres container
	$(DC) stop postgres

.PHONY: db-logs
db-logs: ## Tail Postgres container logs
	$(DC) logs -f postgres

.PHONY: db-migrate
db-migrate: ## Run pending Prisma migrations (dev)
	cd apps/api && $(PM) exec prisma migrate dev

.PHONY: db-migrate-prod
db-migrate-prod: ## Deploy migrations in production (no prompt)
	cd apps/api && $(PM) exec prisma migrate deploy

.PHONY: db-reset
db-reset: ## ⚠ Drop DB, re-run all migrations, and re-seed
	cd apps/api && $(PM) exec prisma migrate reset --force

.PHONY: db-seed
db-seed: ## Run Prisma seed script
	cd apps/api && $(PM) exec prisma db seed

.PHONY: db-studio
db-studio: ## Open Prisma Studio in the browser
	cd apps/api && $(PM) exec prisma studio

.PHONY: db-generate
db-generate: ## Regenerate Prisma client after schema changes
	cd apps/api && $(PM) exec prisma generate

.PHONY: db-push
db-push: ## Push Prisma schema to DB without migration files (prototyping)
	cd apps/api && $(PM) exec prisma db push

# ── Testing ───────────────────────────────────────────────────────────────────
.PHONY: test
test: ## Run all unit tests
	cd apps/api && $(PM) run test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode
	cd apps/api && $(PM) run test:watch

.PHONY: test-cov
test-cov: ## Run unit tests with coverage report
	cd apps/api && $(PM) run test:cov

.PHONY: test-e2e
test-e2e: ## Run end-to-end (integration) tests
	cd apps/api && $(PM) run test:e2e

.PHONY: test-debug
test-debug: ## Run tests in debug mode (Node inspector)
	cd apps/api && $(PM) run test:debug

.PHONY: test-all
test-all: test test-e2e ## Run unit + e2e tests sequentially

# ── Linting & Formatting ──────────────────────────────────────────────────────
.PHONY: lint
lint: ## Lint TypeScript source with ESLint
	cd apps/api && $(PM) run lint

.PHONY: lint-fix
lint-fix: ## Lint and auto-fix fixable issues
	cd apps/api && $(PM) run lint -- --fix

.PHONY: format
format: ## Format source with Prettier
	cd apps/api && $(PM) exec prettier --write "src/**/*.ts" "test/**/*.ts"

.PHONY: typecheck
typecheck: ## Run TypeScript type checking (no emit)
	cd apps/api && $(PM) exec tsc --noEmit

.PHONY: check
check: lint typecheck ## Run lint + typecheck together

# ── Docker ────────────────────────────────────────────────────────────────────
.PHONY: docker-up
docker-up: ## Start all Docker Compose services
	$(DC) up -d

.PHONY: docker-down
docker-down: ## Stop all Docker Compose services
	$(DC) down

.PHONY: docker-rebuild
docker-rebuild: ## Rebuild all images and restart services
	$(DC) up -d --build

.PHONY: docker-logs
docker-logs: ## Tail all Docker Compose logs
	$(DC) logs -f

.PHONY: docker-ps
docker-ps: ## Show status of Docker Compose services
	$(DC) ps

.PHONY: docker-clean
docker-clean: ## Remove containers, networks, and volumes (⚠ data loss)
	$(DC) down -v --remove-orphans

# ── Stellar / Soroban ─────────────────────────────────────────────────────────
.PHONY: contract-build
contract-build: ## Build the Soroban/Rust contract
	cd contracts/earn-quest && cargo build --release

.PHONY: contract-test
contract-test: ## Run Rust contract unit tests
	cd contracts/earn-quest && cargo test

.PHONY: contract-deploy-testnet
contract-deploy-testnet: ## Deploy contract to Stellar testnet
	@echo "$(YELLOW)Deploying to testnet…$(RESET)"
	soroban contract deploy \
	  --wasm contracts/earn-quest/target/wasm32-unknown-unknown/release/earn_quest.wasm \
	  --network testnet \
	  --secret-key $$SOROBAN_SECRET_KEY \
	  --rpc-url $$SOROBAN_RPC_URL

.PHONY: contract-fmt
contract-fmt: ## Format Rust contract source
	cd contracts/earn-quest && cargo fmt

.PHONY: contract-clippy
contract-clippy: ## Run Clippy lints on contract source
	cd contracts/earn-quest && cargo clippy -- -D warnings

# ── Compound / CI shortcuts ───────────────────────────────────────────────────
.PHONY: setup
setup: install db-up db-migrate ## First-time setup: install deps, start DB, run migrations
	@echo "$(GREEN)✔ Setup complete. Run 'make dev' to start the backend.$(RESET)"

.PHONY: ci
ci: install-ci lint typecheck test ## Full CI pipeline: install → lint → typecheck → test

.PHONY: ci-full
ci-full: ci test-e2e ## Full CI pipeline including e2e tests

.PHONY: fresh
fresh: docker-clean docker-up db-migrate ## Nuclear reset: wipe Docker volumes, restart, re-migrate

.PHONY: clean
clean: ## Remove compiled artifacts (dist/, coverage/)
	rm -rf apps/api/dist apps/api/coverage

.PHONY: nuke
nuke: clean docker-clean ## Remove all build artifacts AND Docker volumes (⚠ use with care)

# ── Utilities ─────────────────────────────────────────────────────────────────
.PHONY: env-check
env-check: ## Verify required environment variables are set
	@missing=0; \
	for var in DATABASE_URL STELLAR_NETWORK SOROBAN_RPC_URL CONTRACT_ID JWT_SECRET; do \
	  if [ -z "$${!var}" ]; then \
	    echo "$(YELLOW)⚠  Missing: $$var$(RESET)"; missing=1; \
	  else \
	    echo "$(GREEN)✔  $$var$(RESET)"; \
	  fi; \
	done; \
	[ $$missing -eq 0 ] && echo "$(GREEN)All required env vars are set.$(RESET)" \
	  || (echo "$(YELLOW)Copy .env.example → apps/api/.env and fill in the blanks.$(RESET)"; exit 1)

.PHONY: logs-api
logs-api: ## Tail the API service logs (Docker)
	$(DC) logs -f api

.PHONY: shell-api
shell-api: ## Open a shell inside the running API container
	$(DC) exec api /bin/sh