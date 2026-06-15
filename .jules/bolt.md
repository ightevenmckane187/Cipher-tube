## 2025-05-25 - Manual String Parsing for Template and Path Resolution
**Learning:** Manual string traversal with `indexOf` and `substring` is significantly faster than regex matches and `split('.')` for deep object path resolution in Node.js. In hot recursive paths like `resolveParams`, avoiding intermediate array allocations from `split()` and regex capture groups can yield ~25-30% performance gains.
**Action:** Prefer manual string parsing over regex/split for high-frequency path resolution; avoid redundant property validators by centralizing them in a single exported helper.

## 2025-05-25 - LRU-Cache for Sliding Session Throttling
**Learning:** Throttling database write operations (like Redis `EXPIRE`) using a short-lived in-memory LRU cache (e.g., 60s TTL) significantly reduces external system load. Failing to define such a cache before use leads to a `ReferenceError`, causing server crashes on every authorized request.
**Action:** Always verify that performance-related caches are correctly initialized; use LRU caches to throttle frequent but non-critical state updates.

## 2026-06-14 - Skip Recursion for Complex Objects in resolveParams
**Learning:** Recursively traversing large non-plain objects (like `Buffer` or `Date`) in `resolveParams` is extremely expensive because `Object.keys()` on binary data or complex instances triggers unnecessary overhead. Identifying plain objects (including `Object.create(null)`) and skipping recursion for others can reduce processing time for 1MB Buffers from ~470ms to <0.05ms.
**Action:** Use a `isPlainObject` helper using `Object.getPrototypeOf` to gate recursive object traversal; ensure `Array.isArray` is still handled separately to maintain collection resolution.
