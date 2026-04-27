
Contributing to Cipher-tube

> Modular zero-trust platform — Sentinel · Bolt · Palette

Thank you for your interest in contributing to the Cipher-tube ecosystem. This document defines the governance model, security requirements, agent responsibilities, pull-request workflow, and verification gates that every contribution must satisfy before merge. Read this guide completely before opening your first PR.

---

Table of Contents

- Code of Conduct
- Architecture Overview
- Multi-Agent Governance Policy
- Agent Responsibilities
- Safer-Tube Security Checklist
- Development Setup
- Branch & Commit Conventions
- Pull Request Workflow
- Verification Requirements
- Issue Reporting
- Licensing

---

Code of Conduct

All participants in the Cipher-tube project are expected to uphold a professional, inclusive, and respectful environment. We adopt the Contributor Covenant v2.1. Violations may result in temporary or permanent exclusion from the project at maintainer discretion.

Core principles:

- Act with integrity, transparency, and accountability.
- Respect differing viewpoints, experience levels, and backgrounds.
- Provide constructive, specific feedback — never personal attacks.
- Report unacceptable behavior to the maintainers at the designated security contact.

---

Architecture Overview

Cipher-tube is organized into three modular pillars connected by cryptographic tube layers:

| Pillar | Domain | Scope |
|---|---|---|
| Sentinel | Security | Zero-trust policy enforcement, cryptographic identity, threat detection, audit logging |
| Bolt | Performance | Latency optimization, throughput scaling, resource budgets, benchmark harnesses |
| Palette | UX / Accessibility | Interface rendering, WCAG compliance, theming, interaction telemetry |

Each pillar exposes its own agent interface. The Tube Layer provides encrypted inter-pillar communication, certificate rotation, and tamper-evident message chaining.

```
┌──────────────────────────────────────────────────────────┐
│                   CIPHER-TUBE PLATFORM                   │
├──────────────┬──────────────────┬─────────────────────────┤
│   SENTINEL   │      BOLT        │        PALETTE          │
│  (Security)  │  (Performance)   │     (UX / A11y)         │
├──────────────┴──────────────────┴─────────────────────────┤
│              CRYPTOGRAPHIC TUBE LAYER                     │
│   mTLS · Ed25519 Identity · Hash-Chain Audit · OPA       │
├───────────────────────────────────────────────────────────┤
│                  GOVERNANCE ENGINE                        │
│   Policy Gates · Trust Scores · Compliance Mapping        │
└───────────────────────────────────────────────────────────┘
```

---

Multi-Agent Governance Policy

Cipher-tube employs a multi-agent architecture where automated agents and human contributors share responsibility for code quality, security posture, and operational integrity. The governance policy ensures that no single agent — human or automated — can unilaterally merge changes that affect trust boundaries.

1. Separation of Duties

Every PR that touches a trust boundary must be reviewed by agents from at least two distinct pillars. No contributor may approve their own PR.

| Change Scope | Required Reviewers |
|---|---|
| Sentinel-only (security logic, crypto, policy) | 1 Sentinel maintainer + 1 Bolt or Palette reviewer |
| Bolt-only (perf, scaling, benchmarks) | 1 Bolt maintainer + 1 Sentinel reviewer |
| Palette-only (UI, a11y, theming) | 1 Palette maintainer + 1 Sentinel reviewer |
| Cross-pillar or Tube Layer | 1 maintainer from each affected pillar |
| Governance / CI config / workflow changes | 2 maintainers + project lead sign-off |

2. Trust Tiers

Agents and contributors operate within defined trust tiers:

| Tier | Label | Permissions |
|---|---|---|
| T0 | Observer | Read access, issue creation, discussion |
| T1 | Contributor | Fork, branch, open PRs, request reviews |
| T2 | Trusted Agent | Approve PRs within their pillar, triage issues |
| T3 | Maintainer | Merge authority, CI/CD config, release management |
| T4 | Project Lead | Governance policy changes, trust-tier promotions, security escalations |

Promotion criteria:

- T0 → T1: Signed CLA, verified identity.
- T1 → T2: Minimum 5 merged PRs with zero security regressions, passing Safer-Tube audit.
- T2 → T3: Nomination by existing maintainer, 90-day track record, security review competency demonstrated.
- T3 → T4: Unanimous maintainer consensus.

3. Automated Agent Governance

Automated agents (CI bots, security scanners, AI-assisted reviewers) are subject to additional constraints:

- Identity: Every automated agent must authenticate via Ed25519-signed identity tokens scoped to its pillar.
- Scope Limits: Agents may only read, analyze, and comment within their designated pillar unless explicitly granted cross-pillar access by a T4 lead.
- Action Boundaries: No automated agent may merge, delete branches, modify governance files, or alter CI pipeline definitions.
- Audit Trail: All agent actions are logged to the tamper-evident hash-chain audit ledger. Logs are immutable and append-only.
- Kill Switch: Any T3+ maintainer can revoke an agent's credentials immediately via the governance dashboard.
- Drift Detection: Automated agents are re-evaluated quarterly. Agents whose outputs diverge from policy baselines by > 5% are suspended pending review.

4. Policy-as-Code

Governance rules are encoded in OPA (Open Policy Agent) Rego policies stored in governance/policies/. All policy changes require:

1. A PR with the updated .rego file and corresponding unit tests.
2. Passing opa test in CI.
3. Two T3+ approvals.
4. A 48-hour cool-down period before merge to allow asynchronous review.

---

Agent Responsibilities

Sentinel Agent

The Sentinel Agent owns the security posture of Cipher-tube.

Responsibilities:

- Enforce zero-trust verification on every inter-pillar call.
- Maintain and rotate cryptographic identities (Ed25519 keys, mTLS certificates).
- Run static analysis (SAST), dependency scanning (SCA), and secret detection on every PR.
- Validate that all data-plane inputs are sanitized and placed in DATACONTEXT — never SYSTEMINSTRUCTION.
- Enforce deny-by-default RBAC/ABAC policies via OPA.
- Maintain the tamper-evident audit ledger (hash-chain integrity).
- Respond to CVE disclosures within the SLA defined in SECURITY.md.
- Gate PRs that introduce new dependencies against the approved-dependencies allowlist.

Owned paths:
```
sentinel/
governance/policies/
security/
.github/workflows/sentinel-*.yml
```

Bolt Agent

The Bolt Agent owns performance, scalability, and resource efficiency.

Responsibilities:

- Maintain benchmark harnesses and performance regression tests.
- Enforce resource budgets (CPU, memory, network) for all pillar modules.
- Profile and optimize critical-path latency in the Tube Layer.
- Flag PRs that degrade p50/p95/p99 latency beyond defined thresholds.
- Maintain load-testing infrastructure and publish benchmark reports per release.
- Ensure horizontal scaling configurations remain valid after infrastructure changes.

Owned paths:
```
bolt/
benchmarks/
perf/
.github/workflows/bolt-*.yml
```

Palette Agent

The Palette Agent owns user experience, accessibility, and interface integrity.

Responsibilities:

- Enforce WCAG 2.2 AA compliance on all user-facing surfaces.
- Maintain the design-token system and theming engine.
- Run automated accessibility audits (axe-core, Lighthouse) on every PR that touches UI.
- Validate interaction telemetry collection respects user privacy and data-minimization principles.
- Ensure graceful degradation across supported browsers and devices.
- Maintain component library documentation and Storybook instances.

Owned paths:
```
palette/
ui/
themes/
.github/workflows/palette-*.yml
```

Tube Layer (Shared Ownership)

The cryptographic Tube Layer is jointly owned by all three pillar maintainers.

Responsibilities:

- mTLS handshake and certificate pinning between pillars.
- Message serialization, encryption at rest and in transit.
- Hash-chain message integrity verification.
- Cross-pillar event routing and dead-letter handling.

Owned paths:
```
tube/
crypto/
```

---

Safer-Tube Security Checklist

Every PR must satisfy the Safer-Tube checklist before requesting review. Copy this checklist into your PR description and check each item.

```markdown

Safer-Tube Security Checklist

Identity & Authentication
- [ ] All new endpoints require mTLS or Ed25519 token authentication.
- [ ] No hardcoded secrets, API keys, or credentials in source or config.
- [ ] Secret detection scan (detect-secrets) passes with zero findings.
- [ ] New service accounts are scoped to minimum required permissions.

Input Validation & Injection Defense
- [ ] All external inputs are validated, sanitized, and placed in DATA_CONTEXT.
- [ ] No external data is injected into SYSTEM_INSTRUCTION or policy-evaluation paths.
- [ ] SQL/NoSQL queries use parameterized statements — no string concatenation.
- [ ] GraphQL/REST endpoints enforce depth limits and rate limiting.

Dependency & Supply Chain
- [ ] New dependencies are on the approved-dependencies allowlist (governance/allowed-deps.json).
- [ ] npm audit / pip audit / cargo audit returns zero critical or high findings.
- [ ] Lock files (package-lock.json, poetry.lock, Cargo.lock) are committed and up to date.
- [ ] No dependency uses a known-vulnerable version per CISA KEV or NVD.

Cryptography & Data Protection
- [ ] Encryption at rest uses AES-256-GCM or better.
- [ ] Encryption in transit uses TLS 1.3; no fallback to TLS 1.2 without explicit justification.
- [ ] Key material is managed via the designated secrets manager — never stored in repos.
- [ ] PII/PHI fields are masked in logs and telemetry.

Access Control & Least Privilege
- [ ] RBAC/ABAC policies updated in governance/policies/ if new roles or resources are introduced.
- [ ] No wildcard permissions (*) granted in policy files.
- [ ] Cross-pillar calls enforce the caller's trust tier at the Tube Layer boundary.
- [ ] Elevated-privilege operations require explicit justification in the PR description.

Audit & Observability
- [ ] Security-relevant actions emit structured audit events to the hash-chain ledger.
- [ ] Log entries do not contain secrets, tokens, or unmasked PII.
- [ ] New alert rules are added for anomalous patterns introduced by the change.
- [ ] Dashboards and runbooks are updated if operational procedures change.

Compliance Alignment
- [ ] Changes maintain alignment with M-25-22 zero-trust requirements.
- [ ] NIST 800-53 control mappings in governance/compliance/ are updated if applicable.
- [ ] Accessibility changes maintain WCAG 2.2 AA compliance.
- [ ] Data-handling changes comply with data-minimization and retention policies.
```

---

Development Setup

Prerequisites

- Git ≥ 2.40
- Node.js ≥ 20 LTS or Python ≥ 3.11 or Rust ≥ 1.75 (depending on pillar)
- Docker ≥ 24.0 (for local Tube Layer and integration tests)
- OPA CLI ≥ 0.60 (for policy validation)

Getting Started

```bash

1. Fork and clone
git clone https://github.com/<your-fork>/cipher-tube.git
cd cipher-tube

2. Install dependencies
make install          # Installs all pillar dependencies

3. Run the full test suite
make test             # Unit + integration + policy tests

4. Start the local development environment
make dev              # Spins up Tube Layer, Sentinel, Bolt, Palette in Docker

5. Validate governance policies
make policy-check     # Runs OPA tests against governance/policies/
```

Environment Variables

Copy .env.example to .env and populate required values. Never commit .env files.

---

Branch & Commit Conventions

Branch Naming

```
<pillar>/<type>/<short-description>

Examples:
  sentinel/fix/mtls-handshake-timeout
  bolt/feat/p99-latency-budget
  palette/a11y/screen-reader-nav
  tube/refactor/hash-chain-serialization
  governance/policy/cross-pillar-review-rule
```

Commit Messages

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

Scopes: sentinel, bolt, palette, tube, governance, ci

Examples:

```
feat(sentinel): add Ed25519 token rotation on 1hr TTL
fix(bolt): resolve memory leak in benchmark harness teardown
docs(governance): update trust-tier promotion criteria
ci(tube): add hash-chain integrity check to pipeline
```

Signed Commits

All commits must be GPG or SSH signed. Unsigned commits will be rejected by CI.

```bash
git config commit.gpgsign true
```

---

Pull Request Workflow

1. Pre-Flight

Before opening a PR:

- [ ] Branch is rebased on main with no merge conflicts.
- [ ] All local tests pass (make test).
- [ ] Safer-Tube Security Checklist is completed in the PR description.
- [ ] Commits are signed and follow Conventional Commits format.
- [ ] PR title follows the pattern: <type>(<scope>): <description>.

2. Open the PR

- Target branch: main (or release/* for hotfixes).
- Fill in the PR template completely, including:
  - Summary of changes.
  - Motivation and context.
  - Safer-Tube checklist (copy from above).
  - Breaking changes (if any).
  - Compliance impact (if any).

3. Automated Gates (CI)

The following automated checks run on every PR:

| Gate | Agent | Blocking? |
|---|---|---|
| Unit tests | Bolt | Yes |
| Integration tests | Bolt | Yes |
| SAST / secret detection | Sentinel | Yes |
| Dependency audit (SCA) | Sentinel | Yes |
| OPA policy validation | Sentinel | Yes |
| Performance regression check | Bolt | Yes (if perf-sensitive paths touched) |
| Accessibility audit | Palette | Yes (if UI paths touched) |
| Lint / format check | All | Yes |
| Signed-commit verification | Governance | Yes |
| License compliance scan | Governance | Yes |
| Hash-chain audit integrity | Tube | Yes (if audit paths touched) |

4. Human Review

After CI passes:

1. Auto-assignment: CODEOWNERS routes the PR to the appropriate pillar maintainer(s).
2. Cross-pillar review: If the PR touches paths owned by multiple pillars, reviewers from each pillar are required (see Separation of Duties).
3. Review criteria:
   - Correctness and completeness of implementation.
   - Adherence to Safer-Tube checklist.
   - Test coverage (minimum 80% line coverage for new code).
   - Documentation updates where applicable.
   - No regressions in security posture or performance baselines.
4. Approval threshold: Minimum 2 approvals from authorized reviewers, with at least 1 from the primary pillar owner.

5. Merge

- Merge strategy: Squash and merge for feature branches; merge commit for release branches.
- Only T3+ maintainers may click the merge button.
- The merge commit is automatically signed by the CI service account.
- Post-merge, the branch is automatically deleted.

6. Post-Merge Verification

After merge to main:

- Full integration test suite runs against the merged state.
- Performance benchmarks are recorded and compared to baseline.
- Audit ledger integrity is verified.
- If any post-merge check fails, the merge is automatically reverted and an incident is created.

---

Verification Requirements

Mandatory for All PRs

| Requirement | Description | Enforced By |
|---|---|---|
| Signed commits | GPG or SSH signature on every commit | CI (governance gate) |
| CLA signature | Contributor License Agreement on file | CLA bot |
| Safer-Tube checklist | All applicable items checked in PR description | Reviewer + CI |
| Passing CI | All blocking gates green | GitHub Actions |
| Minimum 2 approvals | From authorized reviewers per CODEOWNERS | Branch protection |
| No unresolved conversations | All review threads resolved before merge | Branch protection |

Additional for Security-Sensitive PRs

PRs that touch any of the following paths require enhanced verification:

```
sentinel/
governance/
tube/crypto/
*.rego
/auth/
/secrets/
```

Enhanced verification includes:

- 3 approvals (including at least 1 T4 project lead).
- Threat model update — document new attack surfaces or mitigations in docs/threat-model/.
- 48-hour review window — PR must remain open for 48 hours minimum to allow asynchronous global review.
- Security advisory draft — if the change addresses a vulnerability, a GitHub Security Advisory draft must be linked.

Release Verification

Before any tagged release:

1. Full regression suite passes on the release candidate branch.
2. Performance benchmarks meet or exceed the previous release baseline.
3. Dependency audit shows zero critical/high findings.
4. Compliance mapping (governance/compliance/) is current.
5. CHANGELOG is updated with all merged PRs since the last release.
6. At least 2 T3+ maintainers sign off on the release tag.

---

Issue Reporting

Bug Reports

Use the Bug Report issue template. Include:

- Affected pillar(s) and version.
- Steps to reproduce.
- Expected vs. actual behavior.
- Environment details (OS, runtime versions, Docker version).
- Relevant logs (redact any secrets or PII).

Security Vulnerabilities

Do not open a public issue for security vulnerabilities.

Follow the responsible disclosure process defined in SECURITY.md. Report vulnerabilities via GitHub's private Security Advisory feature or the designated security contact.

Feature Requests

Use the Feature Request issue template. Include:

- Problem statement and motivation.
- Proposed solution.
- Affected pillar(s).
- Compliance or governance implications (if any).

---

Licensing

By contributing to Cipher-tube, you agree that your contributions will be licensed under the project's license as defined in LICENSE.

All contributions must be original work or properly attributed. Do not introduce code with incompatible licenses. The CI license-compliance scan will flag any violations.

---

Questions?

- Discussions: Use GitHub Discussions for general questions.
- Security: See SECURITY.md for vulnerability reporting.
- Governance: See governance/ for policy source files.

---

This document is maintained by the Cipher-tube governance team. Last updated: April 2026.
