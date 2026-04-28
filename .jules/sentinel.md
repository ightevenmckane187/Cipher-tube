## 2026-04-17 - Sanitized Redis Error Logging
**Vulnerability:** Potential credential leakage in logs via raw Redis error objects.
**Learning:** Default error objects in some libraries (like Redis) can contain connection strings including passwords if the connection fails.
**Prevention:** Always log only the `err.message` or specific sanitized fields when handling database connection errors, rather than the entire error object.

## 2026-04-18 - Header Length Validation
**Vulnerability:** Denial of Service (DoS) and cache displacement via oversized request headers.
**Learning:** Untrusted headers like `x-user-id` can be used to bloat in-memory caches or cause resource exhaustion if not size-limited at the application level, even if the reverse proxy has its own limits.
**Prevention:** Implement centralized middleware to validate the presence, type, and maximum length of critical custom headers before they reach business logic or caching layers.

## 2026-04-27 - Missing CTA Endpoints Hidden Behind Test Suite
**Vulnerability:** The test suite depended on /mcp/:sessionId/encrypt and /mcp/:sessionId/decrypt endpoints that did not exist in the codebase. This created a silent architectural gap where critical cryptographic operations were assumed but not implemented.
**Learning:** The absence of these endpoints meant the application was operating with an incomplete security boundary. Tests were written for a security model the server did not actually enforce. This mismatch forced a larger scope fix to restore functional and security integrity.
**Prevention:** When tests reference security-critical endpoints, treat missing implementations as architectural vulnerabilities. Validate that all test-referenced security surfaces exist before beginning security hardening cycles.
