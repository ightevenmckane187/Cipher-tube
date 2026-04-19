## 2026-04-18 - Redis-Backed Rate Limiting
**Vulnerability:** Denial-of-Service (DoS) susceptibility due to lack of rate limiting.
**Learning:** In-memory rate limiting can lead to memory exhaustion (resource leak) if not pruned. Redis provides a scalable, TTL-backed alternative using `INCR` and `EXPIRE`.
**Prevention:** Always use a TTL-backed store (like Redis) for rate limiting data and ensure middleware is placed *after* security headers (like Helmet) to maintain protection on all response types.
