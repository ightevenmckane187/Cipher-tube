## 2026-04-17 - Sanitized Redis Error Logging
**Vulnerability:** Potential credential leakage in logs via raw Redis error objects.
**Learning:** Default error objects in some libraries (like Redis) can contain connection strings including passwords if the connection fails.
**Prevention:** Always log only the `err.message` or specific sanitized fields when handling database connection errors, rather than the entire error object.

## 2026-04-18 - Header Length Validation
**Vulnerability:** Denial of Service (DoS) and cache displacement via oversized request headers.
**Learning:** Untrusted headers like `x-user-id` can be used to bloat in-memory caches or cause resource exhaustion if not size-limited at the application level, even if the reverse proxy has its own limits.
**Prevention:** Implement centralized middleware to validate the presence, type, and maximum length of critical custom headers before they reach business logic or caching layers.

## 2025-05-15 - Cryptographic Fail-Secure Handling
**Vulnerability:** Information leakage or service degradation via unhandled cryptographic exceptions.
**Learning:** Node.js `crypto` can throw specific errors (e.g., "Unsupported state") during decryption of tampered data that might escape generic `bad decrypt` checks, potentially leading to 500 errors and leaking internal stack traces if not caught.
**Prevention:** Explicitly catch and map cryptographic errors to 400 Bad Request with generic "Decryption failed" messages to ensure the system fails securely without exposing implementation details.

## 2025-05-20 - Defense-in-Depth for Multi-Layer Decryption
**Vulnerability:** Service instability (500 errors) via malformed "onion" encryption payloads.
**Learning:** Even with generic crypto error catching, missing structural validation (e.g., minimum length for N-layers, hex format) can trigger unhandled edge cases in buffer slicing or internal library calls before cryptographic verification occurs.
**Prevention:** Implement structural sanity checks (format, minimum length, metadata presence) at the start of the decryption pipeline to reject invalid payloads early and prevent 400-level client errors from escalating to 500-level server errors.

## 2026-04-27 - Missing hash validation & layer mismatch
**Vulnerability:** CTA tube metadata allowed malformed hash fields and used inconsistent layer indexing (12 + j), creating ambiguity in decryption order.
**Learning:** The CTA pipeline relies on strict structural guarantees; even one missing field or misaligned layer index can destabilize multi-layer decryption.
**Prevention:** Always validate all required tube fields (salt, iv, tag, hash) and use explicit, predictable layer numbering (24-12 and 11-0) to avoid ambiguity.
