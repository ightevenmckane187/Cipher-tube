---
name: Cipher Tube Workspace Instructions
description: |
  Project-wide guidance for AI helper behavior in Cipher-tube repository.
  Use this file for code changes, bug fixes, feature work, tests, docs, and design updates.
  Prefer links to existing documentation over repeating content.
  Prioritize minimal, safe changes with clear tests.
applyTo: "**/*"
---

## 1. Project Context

- This repo implements a Redis+Express `mcp` session service and Cipher Tube Assembly architecture material.
- Key behaviors:
  - session ownership recorded as `session:{sessionId}:owner` in Redis
  - middleware enforces `x-user-id` authenticated access
- Tech stack: Node.js (18+), Express, Redis, optional TypeScript with `server.ts` example.

## 2. Dev setup and commands

- `npm install`
- `npm run dev` or `npx tsx server.ts`
- `npm test` (Jest tests expected)
- Redis required locally (or configure `REDIS_URL` in `.env`)

## 3. Agent behavior for tasks

- When implementing endpoints, keep REST semantics and status codes:
  - 400 missing/invalid params
  - 401 missing auth
  - 403 unauthorized ownership
  - 404 resource-not-found
- Prefer existing naming / path conventions (`/mcp`, `/mcp/:sessionId/check`).
- Add/adjust tests via existing Jest pattern and keep them fast.

## 4. Documentation conventions

- Update README when behavior changes.
- Keep docs in-place; avoid duplication of API semantics in code comments unless necessary.
- Use the `Redis CLI Helpers` section in README for operational notes.

## 5. Common checklist before PR

- [ ] Local tests pass
- [ ] Behaviour covered by tests for security boundary (session ownership)
- [ ] No plaintext credentials in code
- [ ] .env variable usage is documented

## 6. Example prompt patterns for this repository

- "Implement missing session invalidation in `mcp` authority middleware and add Jest coverage."
- "Add a new `GET /mcp/:sessionId/owner` route that returns owner id with auth checks."
- "Audit README for consistency with current endpoint behavior and fix session middleware docs."

## 7. Architecture and component boundaries

- API surface: `/mcp` endpoints in `server.ts` or equivalent Express module.
- Redis keys: `session:{sessionId}:owner` for session ownership, `mcp:shttp:toserver:{sessionId}` for pub/sub presence.
- Middleware: `ensureSessionOwner` and request user resolver must enforce `x-user-id` and ownership.
- Testing: Jest files should mock Redis calls and assert 401/403/404 paths.

## 8. Common pitfalls and anti-patterns

- Do not trust unvalidated `sessionId` from params; 400 on malformed/empty.
- Missing `x-user-id` must always return 401 before any data access.
- Do not leak Redis errors to clients; use structured logging and generic 500 responses.
- Avoid global Redis clients with shared state in tests (use per-test mock/fixture).

## Next recommended agent customization

- Add `.github/agents/cipher-tube-api.agent.md` for API-focused tasks.
- Add `.github/prompts/cipher-tube-testing.prompt.md` for adding test cases (
  includes standard test templates and expected coverage scope).

