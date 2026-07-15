# Sovereign Cypher-Tube v1.0

A compact developer README for the Sovereign Cypher-Tube project.

## v1.0 Sovereign Alpha Updates

The system has transitioned to a persistent, verifiable, and spatially aware sovereign environment.

### Key Components

- **Opcode Dispatcher**: Handles `FUSION` and `COMMIT` operations.
- **Persistence Layer**: Supports signed `.ctube` state files.
- **Spatial SceneGraph**: Hierarchical node management in CSS (Canonical Sovereign Space).
- **CLI Tooling**: `ctube` command for world management.

Quick links

- Full cryptographic API: docs/API.md
- Mythic philosophy & lore: docs/PHILOSOPHY.md
- **System Wiki: WIKI.md**

---

## Developer quickstart

Prerequisites

- Node.js (LTS, e.g. 18+)
- Redis running locally or reachable via REDIS_URL

Install and run

```bash
npm install
npm start
```

---

## Testing

Run the new OS core tests:

```bash
npx vitest tests/unit/sovereign-os.test.ts
```

© 2026 Sovereign Cypher-Tube.
