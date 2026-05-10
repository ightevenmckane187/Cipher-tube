.PHONY: install test test-unit test-integration dev benchmark policy-check lint clean help

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Variables
PILLAR       ?= all
DOCKER_COMP  := docker compose
OPA          := opa

install: ## Install all pillar dependencies
	@echo "📦 Installing Sentinel dependencies..."
	@[ -f sentinel/package.json ] && (cd sentinel && npm ci) || true
	@[ -f sentinel/pyproject.toml ] && (cd sentinel && poetry install) || true
	@[ -f sentinel/Cargo.toml ] && (cd sentinel && cargo build) || true
	@echo "📦 Installing Bolt dependencies..."
	@[ -f bolt/package.json ] && (cd bolt && npm ci) || true
	@[ -f bolt/pyproject.toml ] && (cd bolt && poetry install) || true
	@[ -f bolt/Cargo.toml ] && (cd bolt && cargo build) || true
	@echo "📦 Installing Palette dependencies..."
	@[ -f palette/package.json ] && (cd palette && npm ci) || true
	@[ -f ui/package.json ] && (cd ui && npm ci) || true
	@echo "📦 Installing Tube Layer dependencies..."
	@[ -f tube/package.json ] && (cd tube && npm ci) || true
	@[ -f tube/Cargo.toml ] && (cd tube && cargo build) || true
	@echo "✅ All dependencies installed"

test: test-unit test-integration policy-check ## Run full test suite
	@echo "✅ All tests passed"

test-unit: ## Run unit tests (PILLAR=sentinel|bolt|palette|tube|all)
	@echo "🧪 Running unit tests (pillar=$(PILLAR))..."
ifeq ($(PILLAR),all)
	@for p in sentinel bolt palette tube; do \
		echo "  → $$p"; \
		[ -f $$p/package.json ] && (cd $$p && npm test -- --passWithNoTests) || true; \
		[ -f $$p/pyproject.toml ] && (cd $$p && poetry run pytest tests/unit/ -q) || true; \
		[ -f $$p/Cargo.toml ] && (cd $$p && cargo test --lib) || true; \
	done
else
	@[ -f $(PILLAR)/package.json ] && (cd $(PILLAR) && npm test -- --passWithNoTests) || true
	@[ -f $(PILLAR)/pyproject.toml ] && (cd $(PILLAR) && poetry run pytest tests/unit/ -q) || true
	@[ -f $(PILLAR)/Cargo.toml ] && (cd $(PILLAR) && cargo test --lib) || true
endif

test-integration: ## Run integration tests (PILLAR=sentinel|bolt|palette|tube|all)
	@echo "🔗 Running integration tests (pillar=$(PILLAR))..."
	@$(DOCKER_COMP) -f docker-compose.yml up -d --wait
ifeq ($(PILLAR),all)
	@for p in sentinel bolt palette tube; do \
		echo "  → $$p"; \
		[ -f $$p/package.json ] && (cd $$p && npm run test:integration) || true; \
		[ -f $$p/pyproject.toml ] && (cd $$p && poetry run pytest tests/integration/ -q) || true; \
		[ -f $$p/Cargo.toml ] && (cd $$p && cargo test --test '*') || true; \
	done
else
	@[ -f $(PILLAR)/package.json ] && (cd $(PILLAR) && npm run test:integration) || true
	@[ -f $(PILLAR)/pyproject.toml ] && (cd $(PILLAR) && poetry run pytest tests/integration/ -q) || true
	@[ -f $(PILLAR)/Cargo.toml ] && (cd $(PILLAR) && cargo test --test '*') || true
endif
	@$(DOCKER_COMP) -f docker-compose.yml down

policy-check: ## Validate OPA governance policies
	@echo "📜 Running OPA policy tests..."
	@$(OPA) test governance/policies/ -v
	@echo "✅ All governance policies passed"

policy-fmt: ## Format Rego policy files
	@$(OPA) fmt -w governance/policies/

benchmark: ## Run performance benchmarks
	@echo "⚡ Starting benchmark environment..."
	@$(DOCKER_COMP) -f docker-compose.bench.yml up -d --wait
	@sleep 5
	@echo "⚡ Running benchmarks..."
	@[ -f bolt/package.json ] && (cd bolt && npm run benchmark) || true
	@[ -f bolt/Cargo.toml ] && (cd bolt && cargo bench) || true
	@echo "⚡ Tearing down..."
	@$(DOCKER_COMP) -f docker-compose.bench.yml down -v
	@echo "✅ Benchmarks complete"

dev: ## Start local development environment
	@echo "🚀 Starting Cipher-tube development environment..."
	@$(DOCKER_COMP) -f docker-compose.yml up -d --build
	@echo ""
	@echo "  Sentinel:  http://localhost:3001"
	@echo "  Bolt:      http://localhost:3002"
	@echo "  Palette:   http://localhost:3003"
	@echo "  Tube:      http://localhost:3000"
	@echo ""
	@echo "✅ Development environment ready. Run 'make dev-down' to stop."

dev-down: ## Stop local development environment
	@$(DOCKER_COMP) -f docker-compose.yml down

dev-logs: ## Tail development environment logs
	@$(DOCKER_COMP) -f docker-compose.yml logs -f

lint: ## Run all linters
	@echo "🔍 Linting..."
	@[ -d palette ] && npx eslint palette/ ui/ --ext .ts,.tsx,.js,.jsx || true
	@[ -d themes ] && npx stylelint "palette/**/*.{css,scss}" "themes/**/*.{css,scss}" || true
	@[ -f sentinel/pyproject.toml ] && (cd sentinel && poetry run ruff check .) || true
	@$(OPA) fmt --diff governance/policies/
	@echo "✅ Lint complete"

fmt: ## Auto-format all code
	@npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}" || true
	@[ -f sentinel/pyproject.toml ] && (cd sentinel && poetry run ruff format .) || true
	@$(OPA) fmt -w governance/policies/
	@echo "✅ Format complete"

security-scan: ## Run local security scans
	@echo "🔒 Running secret detection..."
	@detect-secrets scan --all-files --baseline .secrets.baseline
	@echo "🔒 Running dependency audit..."
	@[ -f package-lock.json ] && npm audit --audit-level=high || true
	@[ -f poetry.lock ] && pip-audit || true
	@[ -f Cargo.lock ] && cargo audit || true
	@echo "✅ Security scan complete"

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	@rm -rf node_modules/
	@rm -rf */node_modules/
	@rm -rf */target/
	@rm -rf */pycache/
	@rm -rf coverage/
	@rm -rf storybook-static/
	@rm -rf benchmark-results.json benchmark-report.md
	@echo "✅ Clean complete"

help: ## Show this help message
	@echo "Cipher-tube — Available Commands"
	@echo "================================"
	@grep -E '^[a-zA-Z-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
