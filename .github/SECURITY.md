
Security Policy — Cipher-tube

> Zero-trust by default. Every boundary is a checkpoint.

This document defines how the Cipher-tube project handles security vulnerabilities, incident response, and responsible disclosure. It is the authoritative reference for reporters, maintainers, and automated agents operating within the Sentinel pillar.

---

Table of Contents

- Supported Versions
- Reporting a Vulnerability
- What to Include
- What NOT to Do
- Response SLAs
- Severity Matrix
- Incident Response Process
- Security Contacts
- Safe Harbor
- Security Architecture Summary
- Dependency & Supply-Chain Policy
- Audit & Compliance

---

Supported Versions

| Version | Supported | Notes |
|---|---|---|
| main (HEAD) | ✅ Yes | Active development — all patches applied |
| Latest stable release (v..*) | ✅ Yes | Security patches backported |
| Previous minor release (v.{n-1}.) | ⚠️ Critical only | Critical and high severity patches only |
| Older releases | ❌ No | Upgrade required |

If you are running an unsupported version, please upgrade before reporting. We cannot guarantee fixes for end-of-life releases.

---

Reporting a Vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Use one of the following private channels:

Option 1 — GitHub Security Advisory (Preferred)

1. Navigate to the repository's Security tab.
2. Click "Report a vulnerability" under Security Advisories.
3. Fill in the advisory form with the details described in What to Include.
4. Submit. The maintainer team will be notified immediately.

Option 2 — Encrypted Email

Send an encrypted report to the security contact listed in Security Contacts.

- Use the project's PGP public key published at security/pgp-key.asc in this repository.
- Subject line: [CIPHER-TUBE SECURITY] <brief description>
- Include all details from What to Include.

Option 3 — Private Contact Form

If neither option above is accessible, reach out via the private contact form linked in the repository's profile.

---

What to Include

A complete vulnerability report helps us triage and fix faster. Please include:

| Field | Description |
|---|---|
| Summary | One-paragraph description of the vulnerability |
| Affected component | Pillar (Sentinel / Bolt / Palette / Tube) and specific module or file path |
| Affected versions | Version range or commit SHAs where the vulnerability exists |
| Severity estimate | Your assessment using the Severity Matrix below |
| Reproduction steps | Step-by-step instructions to trigger the vulnerability |
| Proof of concept | Code, script, or screenshots demonstrating the issue (if available) |
| Impact assessment | What an attacker could achieve — data exposure, privilege escalation, DoS, etc. |
| Suggested fix | If you have a proposed patch or mitigation (optional but appreciated) |
| Environment | OS, runtime versions, Docker version, relevant configuration |
| Reporter identity | Name/handle and preferred contact method for follow-up |

---

What NOT to Do

- Do not disclose the vulnerability publicly until a fix is released and the advisory is published.
- Do not exploit the vulnerability against production systems, other users, or third-party infrastructure.
- Do not access, modify, or delete data belonging to other users during testing.
- Do not perform denial-of-service attacks, social engineering, or physical security attacks.
- Do not use automated scanning tools against production endpoints without prior written authorization.

---

Response SLAs

We commit to the following response timelines from the moment a valid report is received:

| Milestone | SLA |
|---|---|
| Acknowledgment | ≤ 24 hours |
| Initial triage & severity classification | ≤ 48 hours |
| Status update to reporter | Every 5 business days until resolution |
| Critical fix developed | ≤ 7 calendar days |
| High fix developed | ≤ 14 calendar days |
| Medium fix developed | ≤ 30 calendar days |
| Low fix developed | Next scheduled release cycle |
| Advisory published | Within 48 hours of fix release |

If we cannot meet an SLA, we will communicate the delay and revised timeline to the reporter.

---

Severity Matrix

We use a four-level severity classification aligned with CVSS v4.0 base scoring:

🔴 Critical (CVSS 9.0–10.0)

- Remote code execution (RCE) in any pillar or the Tube Layer.
- Authentication bypass granting unauthorized T3+ access.
- Cryptographic key material exposure (Ed25519 private keys, mTLS certificates).
- Hash-chain audit ledger tampering or forgery.
- Supply-chain compromise of a direct dependency.

Response: Emergency patch within 7 days. All maintainers notified immediately. Incident response activated.

🟠 High (CVSS 7.0–8.9)

- Privilege escalation between trust tiers (e.g., T1 → T2).
- Cross-pillar data leakage through the Tube Layer.
- OPA policy bypass allowing unauthorized actions.
- Persistent XSS or injection in Palette-rendered surfaces.
- Denial of service against critical infrastructure (Tube Layer, governance engine).

Response: Patch within 14 days. Sentinel maintainer leads triage.

🟡 Medium (CVSS 4.0–6.9)

- Information disclosure of non-sensitive internal metadata.
- Reflected XSS or CSRF in non-critical Palette endpoints.
- Timing side-channel leaking partial key material.
- Misconfigured RBAC policy granting unintended read access.
- Dependency with a known medium-severity CVE.

Response: Patch within 30 days. Tracked in the security backlog.

🟢 Low (CVSS 0.1–3.9)

- Verbose error messages exposing internal paths or versions.
- Missing security headers on non-sensitive endpoints.
- Informational findings from automated scans with no exploitable path.
- Documentation inaccuracies in security guidance.

Response: Addressed in the next scheduled release. May be deprioritized if no exploitable path exists.

---

Incident Response Process

When a vulnerability is confirmed as Critical or High:

Phase 1 — Containment (0–4 hours)

1. Sentinel maintainer activates the incident response channel.
2. Affected components are identified and isolated if necessary.
3. Automated agent credentials are rotated if agent compromise is suspected.
4. Initial impact assessment is documented.

Phase 2 — Investigation (4–48 hours)

1. Root cause analysis identifies the vulnerable code path.
2. Blast radius is determined — affected versions, deployments, and users.
3. Forensic review of the hash-chain audit ledger for evidence of exploitation.
4. Threat model is updated in docs/threat-model/.

Phase 3 — Remediation (48 hours – SLA deadline)

1. Fix is developed on a private security branch.
2. Fix undergoes full Safer-Tube checklist review.
3. Regression tests are added to prevent recurrence.
4. Fix is reviewed by at least 2 Sentinel maintainers + 1 T4 project lead.

Phase 4 — Disclosure (Within 48 hours of fix release)

1. Patched versions are released.
2. GitHub Security Advisory is published with full details.
3. CHANGELOG is updated.
4. Reporter is credited (unless they request anonymity).
5. Post-incident review is conducted and lessons learned are documented.

---

Security Contacts

| Role | Contact Method |
|---|---|
| Primary security contact | GitHub Security Advisory (preferred) |
| Backup | Encrypted email to the address listed in security/CONTACTS.md |
| PGP key | security/pgp-key.asc in this repository |

---

Safe Harbor

We consider security research conducted in accordance with this policy to be:

- Authorized under applicable anti-hacking laws.
- Exempt from DMCA restrictions to the extent the research involves circumvention for security purposes.
- Welcomed — we will not initiate legal action against researchers who follow this policy.

To qualify for safe harbor:

1. Follow the reporting channels defined above.
2. Make a good-faith effort to avoid privacy violations, data destruction, and service disruption.
3. Do not access or modify other users' data.
4. Allow reasonable time for a fix before any public disclosure.

We will credit researchers in our security advisories (with consent) and are open to recognition in a future security hall of fame.

---

Security Architecture Summary

Cipher-tube's security model is built on the following principles:

| Principle | Implementation |
|---|---|
| Zero Trust | Every inter-pillar call requires mTLS + Ed25519 token validation. No implicit trust. |
| Least Privilege | RBAC/ABAC via OPA — deny-by-default. Agents scoped to their pillar. |
| Defense in Depth | SAST, SCA, secret detection, signed commits, policy-as-code, hash-chain audit. |
| Immutable Audit | Tamper-evident hash-chain ledger for all security-relevant actions. |
| Separation of Duties | Cross-pillar review required for trust-boundary changes. No self-approval. |
| Cryptographic Identity | Ed25519 keys for agents and contributors. Certificate rotation enforced. |

For full architecture details, see the Architecture Overview in CONTRIBUTING.md.

---

Dependency & Supply-Chain Policy

- All direct dependencies must be listed in governance/allowed-deps.json.
- New dependencies require a security review by a Sentinel maintainer before approval.
- Automated dependency scanning runs on every PR via npm audit / pip audit / cargo audit.
- Dependencies with unpatched Critical or High CVEs are blocked from merge.
- Transitive dependency updates are monitored via Dependabot / Renovate with auto-PR enabled.
- Lock files must be committed and kept in sync. Drift is a blocking CI failure.

---

Audit & Compliance

| Framework | Status | Mapping Location |
|---|---|---|
| NIST 800-53 Rev. 5 | Active | governance/compliance/nist-800-53.json |
| M-25-22 Zero Trust | Active | governance/compliance/m-25-22.json |
| OWASP Agentic AI Top 10 | Active | governance/compliance/owasp-agentic-ai.json |
| WCAG 2.2 AA | Active (Palette) | governance/compliance/wcag-2.2.json |

Compliance mappings are version-controlled and updated with every governance policy change. Mapping PRs follow the same review and cool-down process as policy changes (see CONTRIBUTING.md — Policy-as-Code).

---

This document is maintained by the Cipher-tube Sentinel team. Last updated: April 2026.
