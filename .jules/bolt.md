## 2025-05-25 - Manual String Parsing for Template and Path Resolution
**Learning:** Manual string traversal with `indexOf` and `substring` is significantly faster than regex matches and `split('.')` for deep object path resolution in Node.js. In hot recursive paths like `resolveParams`, avoiding intermediate array allocations from `split()` and regex capture groups can yield ~25-30% performance gains.
**Action:** Prefer manual string parsing over regex/split for high-frequency path resolution; avoid redundant property validators by centralizing them in a single exported helper.

## 2025-05-25 - LRU-Cache for Sliding Session Throttling
**Learning:** Throttling database write operations (like Redis `EXPIRE`) using a short-lived in-memory LRU cache (e.g., 60s TTL) significantly reduces external system load. Failing to define such a cache before use leads to a `ReferenceError`, causing server crashes on every authorized request.
**Action:** Always verify that performance-related caches are correctly initialized; use LRU caches to throttle frequent but non-critical state updates.

## 2025-05-25 - One-Shot Hashing with `crypto.hash`
**Learning:** Node.js v21.7+ introduced `crypto.hash` which is ~2.2x faster than the streaming `createHash` API for small inputs (like session tokens or integrity hashes). Using the `encoding` parameter directly in `crypto.hash` further reduces overhead by avoiding intermediate `Buffer` allocations.
**Action:** Use the `fastHash` utility for all one-shot hashing needs to leverage native performance gains while maintaining backward compatibility.

## 2026-06-19 - Redundant Hash Elimination in Middleware
**Learning:** Reusing a pre-computed hash (blindedKey) across multiple lookups (L1 LRU cache and L2 Redis) saves significant CPU cycles in high-traffic middlewares like `ensureSessionOwner`. A SHA-256 operation takes ~1-2μs; eliminating it from every request provides a measurable performance gain and reduces latency.
**Action:** In authentication middlewares, compute the hash once and propagate it through the validation chain.

## 2026-06-19 - Session Rotation Race Conditions and Grace Periods
**Learning:** Immediate deletion of old session tokens during rotation causes race conditions for rapid concurrent requests from the same client. Implementing a 5-second grace period via Redis `EXPIRE` allows in-flight requests to complete while maintaining security.
**Action:** Use a short TTL grace period instead of `DEL` when rotating sensitive state to improve system resilience.

## 2026-06-19 - Cryptographic Bounds of `fastHash` for Blinded Tokens
**Learning:** `fastHash` (SHA-256) is highly efficient for session blinding and integrity checks. However, for session lookups, it must always be accompanied by high-entropy inputs (like UUID tokens) to remain collision-resistant. Relying on `fastHash` for low-entropy primary lookups could expose the system to collision-based session hijacking.
**Action:** Use `fastHash` only for blinding high-entropy secrets (e.g., UUID-based tokens) in Redis lookups; do not use it as a primary lookup key for user-supplied low-entropy data.
