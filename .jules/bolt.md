## 2025-04-18 - Optimized Session Management Implementation
**Learning:** Native `crypto.randomUUID()` is generally faster than the `uuid` package in Node.js 18+. Short-lived in-memory caching of Redis lookups (even for 5 seconds) can significantly reduce database load and improve response times for high-frequency repeated requests.
**Action:** Use native crypto and implement short-lived caching for session validation.

## 2025-05-22 - Optimized CTA Cryptographic Processing
**Learning:** Redundant cryptographic operations (like hashing the same data 12 times in a loop) are a major bottleneck. Moving these outside the loop and using high-performance one-shot APIs like `crypto.hash()` significantly improves throughput. Additionally, replacing $O(N)$ array searches with $O(1)$ Map lookups yields measurable gains even for small datasets.
**Action:** Always identify invariant computations in loops and move them out; use `Map` for frequent lookups by ID/layer.

## 2026-04-30 - Optimized CTA Decryption and Structural Efficiency
**Learning:** Hoisting SHA-512 hash calculations when the input remains constant across loop iterations (like in the hash-lock verification phase) provides a significant performance boost. Additionally, pre-computing HKDF info buffers avoids repeated string-to-buffer conversions. Using a single `for...of` loop for Map construction is more efficient than a `.filter().map()` chain which creates multiple intermediate arrays.
**Action:** Always identify invariant computations in loops and hoist them; prefer single-pass iterations for data structure construction.

## 2026-05-15 - Entropy Pooling and One-shot Hashing
**Learning:** Generating a single larger Buffer of random bytes via `crypto.randomBytes()` and slicing it with `subarray()` is significantly faster than multiple small calls due to reduced context-switching overhead. Additionally, the Node.js 21.7+ `crypto.hash()` one-shot API is faster than the `createHash` stream-based approach, especially when using `'buffer'` output encoding to return a Buffer directly.
**Action:** Consolidate multiple random byte requests into a single entropy pool; prefer the one-shot `crypto.hash()` API for simple hashing tasks.
