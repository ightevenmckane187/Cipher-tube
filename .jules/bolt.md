## 2025-05-25 - Manual String Parsing for Template and Path Resolution
**Learning:** Manual string traversal with `indexOf` and `substring` is significantly faster than regex matches and `split('.')` for deep object path resolution in Node.js. In hot recursive paths like `resolveParams`, avoiding intermediate array allocations from `split()` and regex capture groups can yield ~25-30% performance gains.
**Action:** Prefer manual string parsing over regex/split for high-frequency path resolution; avoid redundant property validators by centralizing them in a single exported helper.

## 2026-06-25 - Manual Interpolation Traversal
**Learning:** Replacing global regex-based `String.prototype.replace` with a manual `indexOf` and `substring` loop for template interpolation (e.g., `${state.key}`) in hot code paths like `resolveParams` reduces execution time by ~30%. This avoids the overhead of the regex engine and intermediate capture group allocations.
**Action:** Use manual string scanning for known, simple template patterns in high-frequency execution loops.

## 2025-05-25 - LRU-Cache for Sliding Session Throttling
**Learning:** Throttling database write operations (like Redis `EXPIRE`) using a short-lived in-memory LRU cache (e.g., 60s TTL) significantly reduces external system load. Failing to define such a cache before use leads to a `ReferenceError`, causing server crashes on every authorized request.
**Action:** Always verify that performance-related caches are correctly initialized; use LRU caches to throttle frequent but non-critical state updates.

## 2025-05-25 - One-Shot Hashing with `crypto.hash`
**Learning:** Node.js v21.7+ introduced `crypto.hash` which is ~2.2x faster than the streaming `createHash` API for small inputs (like session tokens or integrity hashes). Using the `encoding` parameter directly in `crypto.hash` further reduces overhead by avoiding intermediate `Buffer` allocations.
**Action:** Use the `fastHash` utility for all one-shot hashing needs to leverage native performance gains while maintaining backward compatibility.

## 2026-05-25 - Consolidating Redundant Hashing via Request Context
**Learning:** Performing multiple independent SHA-256 hashes on the same token (e.g., once for local cache and once for Redis key) in the same request lifecycle is wasteful. Consolidating these into a single `getSessionKeys` call and storing the results in `res.locals` achieves a near 2x speedup for the hashing logic and reduces CPU pressure.
**Action:** Always check for redundant cryptographic operations on the same inputs within a single request; use middleware to pre-compute and share these values via `res.locals`.
