# Changelog

All notable changes to the Cipher-tube project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Multi-agent governance framework with trust tiers T0–T4 and separation-of-duties enforcement
- Safer-Tube 24-item security checklist embedded in PR workflow
- OPA Rego policies: crosspillarreview, trust_tier, agent_boundary, safertubechecklist
- Full test suites for all governance policies
- GitHub Actions CI workflows:
  - governance-policy-gate.yml — OPA-based PR gate
  - sentinel-security-scan.yml — secret detection, SAST, SCA, license compliance
  - bolt-perf-check.yml — benchmark regression detection
  - palette-a11y-check.yml — WCAG 2.2 AA automated testing
  - governance-signed-commits.yml — GPG/SSH verification, Conventional Commits, CLA
- CODEOWNERS with pillar-aligned ownership mapping
- SECURITY.md with vulnerability disclosure, CVSS v4.0 severity matrix, and incident response
- CONTRIBUTING.md with architecture overview, governance model, and PR workflow
- Compliance mapping stubs:
  - NIST SP 800-53 Rev. 5 (20 controls)
  - OMB M-25-22 Federal Zero Trust (5 pillars)
  - OWASP Agentic AI Top 10 (all 10 risks)
  - WCAG 2.2 Level AA (22 success criteria)
- Approved dependency allowlist (allowed-deps.json) for Node, Python, Rust
- PR template with embedded Safer-Tube checklist
- Issue templates for bug reports and feature requests
- Scaffold directories and placeholder files for all pillars
- Docker Compose configurations for development and benchmarking
- Composite GitHub Action (setup-env) for CI environment provisioning
- Makefile with unified build, test, lint, benchmark, and dev commands
- CodeQL and Lighthouse CI configurations
- Detect-secrets baseline file
- CLA framework with signature tracking

---

## [0.0.0] — 2026-04-27

### Added

- Repository initialization
- Project structure with three pillars: Sentinel (security), Bolt (performance), Palette (UX/accessibility)
- Tube Layer inter-pillar transport scaffold
