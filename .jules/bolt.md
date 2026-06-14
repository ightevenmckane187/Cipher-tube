## 2025-05-25 - Manual String Parsing for Template and Path Resolution
**Learning:** Manual string traversal with `indexOf` and `substring` is significantly faster than regex matches and `split('.')` for deep object path resolution in Node.js. In hot recursive paths like `resolveParams`, avoiding intermediate array allocations from `split()` and regex capture groups can yield ~25-30% performance gains.
**Action:** Prefer manual string parsing over regex/split for high-frequency path resolution; avoid redundant property validators by centralizing them in a single exported helper.

## 2025-05-25 - LRU-Cache for Sliding Session Throttling
**Learning:** Throttling database write operations (like Redis `EXPIRE`) using a short-lived in-memory LRU cache (e.g., 60s TTL) significantly reduces external system load. Failing to define such a cache before use leads to a `ReferenceError`, causing server crashes on every authorized request.
**Action:** Always verify that performance-related caches are correctly initialized; use LRU caches to throttle frequent but non-critical state updates.

## 2026-06-14 - Buffer and Non-Plain Object Anti-pattern in Recursive Resolution
**Learning:** Calling `Object.keys()` or iterating over non-plain objects like `Buffer`, `Date`, or `Map` in a recursive resolution function (e.g., `resolveParams`) is extremely expensive. For a 1MB `Buffer`, `Object.keys()` can take hundreds of milliseconds because it attempts to list all indexed properties.
**Action:** Implement a fast-path to immediately return `Buffer.isBuffer(params)` and ensure that only objects with `constructor === Object` are traversed for template resolution.
