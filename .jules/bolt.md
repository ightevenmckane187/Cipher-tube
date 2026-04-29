## 2025-04-18 - Optimized Session Management Implementation
**Learning:** Native `crypto.randomUUID()` is generally faster than the `uuid` package in Node.js 18+. Short-lived in-memory caching of Redis lookups (even for 5 seconds) can significantly reduce database load and improve response times for high-frequency repeated requests.
**Action:** Use native crypto and implement short-lived caching for session validation.

## 2025-05-22 - Optimized CTA Cryptographic Processing
**Learning:** Redundant cryptographic operations (like hashing the same data 12 times in a loop) are a major bottleneck. Moving these outside the loop and using high-performance one-shot APIs like `crypto.hash()` significantly improves throughput. Additionally, replacing $O(N)$ array searches with $O(1)$ Map lookups yields measurable gains even for small datasets.
**Action:** Always identify invariant computations in loops and move them out; use `Map` for frequent lookups by ID/layer.

## 2025-05-23 - HKDF and Integrity Hoisting Optimizations
**Learning:** In multi-layered cryptographic assemblies, string-to-buffer conversions for HKDF 'info' parameters and redundant integrity hash calculations on invariant data are significant overheads. Pre-computing 'info' buffers and hoisting the final integrity hash out of the verification loop yielded a ~25% throughput increase in decryption.
**Action:** Pre-compute static cryptographic parameters and hoist all invariant computations out of decryption/verification loops.
