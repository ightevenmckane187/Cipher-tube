# Sovereign Cypher-Tube

A compact developer README for the Sovereign Cypher-Tube project. The long-form mythic narrative has been moved to docs/PHILOSOPHY.md — this README focuses on setup, development, and the quick API pointers contributors need.

Quick links
- Full cryptographic API: docs/API.md
- Mythic philosophy & lore (moved from README): docs/PHILOSOPHY.md

## What this project is (short)
Sovereign Cypher-Tube is a node-based system that combines a runtime backend with a mythic-themed governance layer. The system stores per-user session ownership in Redis and exposes middleware to enforce ownership and secure endpoints. For design & motivation, see docs/PHILOSOPHY.md.

---

## Developer quickstart
These instructions get a developer environment running locally.

Prerequisites
- Node.js (>=20.0.0)
- Redis running locally or reachable via `REDIS_URL`
- `pnpm` (>=10.0.0)

Create a local `.env` (refer to `.env.example` for all available options):

```bash
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

Install and run

```bash
pnpm install
# Start the server for development
npx tsx src/server.ts
```

---

## API quick reference (short)
This is a short, high-level reference. See docs/API.md for full endpoint, payload, and cryptography details.

- Headers
  - `x-user-id`: The unique identifier for the user (required for session creation and ownership verification).
  - `x-session-token`: The session token returned upon session creation (required for authenticated endpoints).

- Redis keys
  - `session:{sessionId}:owner` — the owning user id for a session (critical for middleware ownership checks).

- Security & middleware
  - The project enforces per-session ownership. Requests acting on a session must provide the correct `x-user-id` and `x-session-token`.

---

## Testing
Run tests using the project's test runner:

```bash
pnpm test
```

Recommended developer guidance:
- Mock Redis in unit tests (or run a disposable Redis instance) to avoid flakiness.
- Keep cryptographic benchmarks isolated from unit tests (use a dedicated benchmark script).

---

## Contributing & docs
To keep the README focused for new contributors, the extended mythic/philosophy content has been moved to docs/PHILOSOPHY.md. Please open issues or PRs for corrections to the API docs in docs/API.md.

---

© 2026 Sovereign Cypher-Tube. *ightevenmckane*.
