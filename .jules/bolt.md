## 2025-04-18 - Optimized Session Management Implementation
**Learning:** Native `crypto.randomUUID()` is generally faster than the `uuid` package in Node.js 18+. Short-lived in-memory caching of Redis lookups (even for 5 seconds) can significantly reduce database load and improve response times for high-frequency repeated requests.
**Action:** Use native crypto and implement short-lived caching for session validation.

## 2025-05-22 - Optimized CTA Cryptographic Processing
**Learning:** Redundant cryptographic operations (like hashing the same data 12 times in a loop) are a major bottleneck. Moving these outside the loop and using high-performance one-shot APIs like `crypto.hash()` significantly improves throughput. Additionally, replacing $O(N)$ array searches with $O(1)$ Map lookups yields measurable gains even for small datasets.
**Action:** Always identify invariant computations in loops and move them out; use `Map` for frequent lookups by ID/layer.

## 2026-04-30 - Optimized CTA Decryption and Structural Efficiency
**Learning:** Hoisting SHA-512 hash calculations when the input remains constant across loop iterations (like in the hash-lock verification phase) provides a significant performance boost. Additionally, pre-computing HKDF info buffers avoids repeated string-to-buffer conversions. Using a single `for...of` loop for Map construction is more efficient than a `.filter().map()` chain which creates multiple intermediate arrays.
**Action:** Always identify invariant computations in loops and hoist them; prefer single-pass iterations for data structure construction.

## 2026-05-15 - Entropy Pooling and Lockfile Stability
**Learning:** Consolidating multiple `crypto.randomBytes` calls into a single larger call and slicing it with `subarray` significantly reduces syscall overhead and improves performance by ~35% in high-frequency cryptographic paths. Additionally, running `pnpm install` in some environments can destructively update the lockfile; always verify lockfile integrity before submission and avoid committing unrelated dependency changes.
**Action:** Batch entropy generation where possible; always use `git status` and `git restore` to maintain a clean lockfile.

## 2026-05-13 - Optimized Decryption and Hashing Strategy
**Learning:** For small, fixed-range integer keys (e.g., 0-100), a pre-allocated array is significantly faster than a `Map` for lookups. In Node.js 21.7+, `crypto.hash()` is a one-shot API that outperforms `createHash().update().digest()` by avoiding object overhead, but it should be used with a fallback for compatibility with older LTS versions. Avoiding `Buffer.concat` when the second buffer is empty (common in AES-GCM `final()` calls) prevents unnecessary memory copies.
**Action:** Prefer arrays for indexed lookups; use feature detection for high-performance crypto APIs; avoid redundant buffer concatenations.

## 2026-05-20 - Optimized Hashing and Metadata Processing in CTA
**Learning:** Using the one-shot `crypto.hash()` API available in Node.js 22.22.1 provides a measurable performance gain over the streaming `createHash()` API by reducing object overhead. Pre-parsing hex-encoded metadata (salts, hashes) into Buffers during an initial O(1) array-backed lookup pass avoids redundant parsing inside hot decryption loops, further improving efficiency.
**Action:** Prefer one-shot hashing APIs where available; pre-convert string metadata to Buffers before entering high-frequency loops.

## 2026-05-25 - Entropy-to-Hex Optimization and Redundancy Cleanup
**Learning:** Using `buffer.toString('hex', start, end)` is significantly faster than converting a large buffer to a full hex string and then using `.substring()`, as it avoids a massive string allocation. Additionally, removing duplicate middleware and redundant UI elements improves both backend throughput and frontend clarity.
**Action:** Use specific buffer range conversions for hex strings; always audit middleware chains and UI templates for accidental duplication.

## 2026-05-24 - Balanced Optimization and Maintainability at Small Scales
**Learning:** For low-iteration loops (e.g., < 100 iterations), the overhead of parallel arrays or excessive slice-and-convert buffer operations can exceed their performance benefits while significantly hurting code readability. High-impact optimizations like one-shot hashing and pre-parsing metadata into Buffers remain valuable across scales.
**Action:** Prioritize readability for small data structures; use single-object arrays for easier maintenance unless profiling proves it's a critical bottleneck.
