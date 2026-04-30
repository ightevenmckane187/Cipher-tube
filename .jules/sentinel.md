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

## 2026-04-20 - Structural Validation of Metadata Arrays
**Vulnerability:** 500 Internal Server Error (DoS) via malformed metadata elements in arrays.
**Learning:** Functions iterating over complex metadata arrays (like `tubes`) are vulnerable to `TypeError` if array elements are `null` or have unexpected types, even if the array itself is present.
**Prevention:** Explicitly validate each element's existence and type within `find` or loop callbacks before accessing properties to ensure total robustness against malformed JSON payloads.

## 2026-04-21 - Atomic Security-Performance Balance
**Vulnerability:** Logical regressions during performance optimization of cryptographic loops.
**Learning:** Moving expensive operations (like hashing) outside of loops for O(1) performance can create security "theater" if the optimization assumes a static state that might be tampered with. It also complicates security reviews if the intent is not explicitly documented.
**Prevention:** Always maintain per-layer verification logic in multi-layer crypto architectures even if it appears redundant. Use `timingSafeEqual` for ALL sensitive comparisons and ensure the implementation is actually called and not just commented.

## 2026-04-30 - Global Sanitized Error Handling
**Vulnerability:** Information leakage (stack traces) via default Express error pages.
**Learning:** Default Express error handling returns HTML pages with full stack traces for errors occurring in middleware, such as `SyntaxError` from `express.json()` when receiving malformed JSON. This exposes internal path structures and library versions.
**Prevention:** Always implement a global error-handling middleware as the last entry in the middleware chain. This handler must explicitly catch common errors like `SyntaxError` (400) and `PayloadTooLargeError` (413), and return generic JSON responses to ensure the system fails securely without exposing implementation details.
