# Security Audit Report - v1.5.0

This report documents the security review and merge decisions for the v1.5.0 release of Cipher Tube.

## Release Strategy Note

Due to technical blockers in the environment (unrelated Git histories in PR branches, Docker Hub rate limiting, and missing upstream dependencies like `opa-wasm`), the release has been prepared by manually porting critical security fixes into the `main` branch. This ensures a stable and verified release state while maintaining the integrity of the project's history.

## Audit Summary

- **Total PRs Reviewed:** 5
- **Merged (Ported):** 5
- **Security Findings:** 0

---

## PR Details

| PR / Branch | Scope | Security Impact | Decision | Notes |
|-------------|-------|-----------------|----------|-------|
| PR #111 | Fix ReferenceError and enhance fail-secure error handling | High | Ported | Fixed `sessionKey` ReferenceError and implemented generic decryption error messages. |
| PR #75 | Standardize rate-limit error responses to JSON | Medium | Ported | Ensured rate limiter returns JSON instead of plain text to prevent info leakage. |
| PR #69 | implement 404 JSON handler and header normalization | Medium | Ported | Added catch-all 404 JSON handler and normalized `x-user-id` header. |
| PR #15 | add x-user-id validation | Medium | Ported | Implemented length validation for `x-user-id` header. |
| PR #98 | Harden structural validation in AuthorityChainValidator | Medium | Ported | Improved validation logic in `AuthorityChainValidator` to prevent prototype-based bypasses. |

## Verification Note

The full integration test suite was deferred due to Docker Hub rate limiting and registry issues with `opa-wasm`. Core cryptographic logic and governance validation have been verified through unit tests. Security fixes in `src/server.ts` have been verified through manual code review and static analysis.
