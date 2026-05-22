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

## 2025-05-25 - Runtime Compatibility as Availability Risk
**Vulnerability:** Service-wide Denial of Service (DoS) due to Node.js version/API mismatch.
**Learning:** Using cryptographic APIs introduced in newer Node.js versions (e.g., `crypto.hash` in v21.7.0+) when the project declares support for older LTS versions (v20.x) creates a silent failure point that crashes the entire crypto pipeline at runtime.
**Prevention:** Strictly adhere to standard `crypto.createHash` patterns for maximum compatibility across supported LTS versions, and verify API availability against the lowest supported version defined in `package.json`.

## 2026-05-30 - Middleware Order for Rate-Limited Security Headers
**Vulnerability:** Security headers (XFO, HSTS) missing on 429 "Too Many Requests" responses.
**Learning:** Applying rate limiters before security middleware (like `helmet`) causes blocked requests to return without protection. However, applying CSP/nonce generation before the limiter exposes the server to entropy exhaustion DoS.
**Prevention:** Split security middleware: apply core headers (HSTS, X-Frame-Options) before the rate limiter to protect all responses, but apply resource-intensive headers (CSP with nonces) after the limiter to prevent resource waste on malicious traffic.

## 2026-06-05 - Structural Validation of Governance Manifests
**Vulnerability:** Potential Denial of Service (DoS) and logic bypass via malformed manifest objects.
**Learning:** In JavaScript/TypeScript, `typeof [] === 'object'`, which can lead to unexpected behavior or crashes in logic that expects plain objects but receives arrays. This is particularly critical in governance engines where manifests control security gates.
**Prevention:** Always use `!Array.isArray(obj) && typeof obj === 'object'` to verify non-array objects and explicitly check `Array.isArray()` for nested collections before iteration.

## 2026-06-15 - Generic Decryption Error Messages
**Vulnerability:** Information leakage via specific cryptographic error messages (e.g., "Invalid tube metadata", "Missing encryption tube").
**Learning:** Returning detailed validation errors for complex cryptographic payloads can act as an oracle for attackers or reveal internal structural requirements that should remain opaque.
**Prevention:** Map all client-side cryptographic and structural validation errors to a single, generic "Decryption failed" message for public responses, while maintaining detailed logs for internal observability.

## 2026-06-20 - Prototype Bypass in Governance Manifest Validation
**Vulnerability:** Governance manifest validation could be bypassed using built-in object properties (e.g., "toString") when using the "in" operator or direct property access.
**Learning:** In JavaScript, the "in" operator and direct property access check the entire prototype chain. If a manifest specifies a role named "toString", and the validator checks if "toString" exists in the roles object using "roleId in manifest.roles", it will return true even if the role is not explicitly defined in the manifest.
**Prevention:** Always use "Object.prototype.hasOwnProperty.call(obj, prop)" to verify that a property exists directly on an object, especially when dealing with user-supplied keys in security-critical validation logic.

## 2026-06-22 - Activity Refresh for Session Continuity
**Vulnerability:** Inflexible session timeouts leading to service disruption for active users.
**Learning:** Fixed-TTL sessions in Redis do not automatically renew on access. In a zero-trust architecture, user activity should extend session life to balance security with availability.
**Prevention:** Implement "Activity Refresh" (sliding sessions) in the ownership verification middleware. Always wrap Redis `expire` calls in type checks (e.g., `typeof redisClient.expire === 'function'`) to maintain compatibility with varied Redis mock implementations used in integration tests.
