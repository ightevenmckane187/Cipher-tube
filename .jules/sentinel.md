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

## 2025-05-16 - Cryptographic Input Pre-validation
**Vulnerability:** Denial of Service or internal error leakage (500 errors) via malformed cryptographic inputs.
**Learning:** Node.js `crypto` methods like `setAuthTag` or `subarray` can throw `RangeError` or internal `Error` (e.g., "Invalid authentication tag length") if inputs are malformed or too short, often bypassing generic `catch` blocks that only look for specific strings like "bad decrypt".
**Prevention:** Always pre-validate input format (e.g., hex regex) and minimum buffer lengths (e.g., 364 bytes for 13 layers of overhead) before invoking cryptographic operations to ensure the application fails gracefully with 400 Bad Request.
