## 2025-04-18 - Optimized Session Management Implementation
**Learning:** Native `crypto.randomUUID()` is generally faster than the `uuid` package in Node.js 18+. Short-lived in-memory caching of Redis lookups (even for 5 seconds) can significantly reduce database load and improve response times for high-frequency repeated requests.
**Action:** Use native crypto and implement short-lived caching for session validation.

## 2026-04-19 - [Middleware Order & Health Check Caching]
**Learning:** High-frequency endpoints like `/health` can benefit significantly from being placed early in the middleware stack to avoid unnecessary processing (like body parsing). Additionally, caching the health response on a short interval (e.g., 1s) reduces the overhead of constant `Date` object instantiation and ISO string formatting.
**Action:** Always place health/ping routes before resource-heavy middleware and consider interval-based caching for time-stamped status responses.
