***

# Cipher Tube Assembly & Session Service

This repository combines two main pieces:

- A Redis + Express service that enforces per‑user session ownership and basic monitoring.  
- Design and reference material for the **Cipher Tube Assembly (CTA)**, a multi‑layer cryptographic architecture.

## Features

- Per‑user session ownership stored in Redis (`session:{sessionId}:owner`).  
- Middleware to ensure only the owning user can use a session.  
- Redis utilities to inspect and monitor live sessions.  
- Documentation and LaTeX/IEEE whitepaper templates for the Cipher Tube Assembly.

## Prerequisites

- Node.js (LTS, e.g. 18+).  
- Redis running locally (or accessible via `REDIS_URL`).  
- npm or pnpm/yarn for dependencies.

## Installation

```bash
npm install
# or
npm install @redis/client express dotenv
```

## Configuration

Create a `.env` file in the project root:

```env
REDIS_URL=redis://localhost:6379
BASE_URI=http://localhost:3232
```

Adjust values as needed for your environment.

## Running the Server

If you are using the single‑file TypeScript server example (e.g. `server.ts`):

```bash
# Dev run (example)
npm run dev

# Or with tsx directly
npx tsx server.ts
```

The server listens on the port defined in `BASE_URI` (default `http://localhost:3232`).

## Session API

### Create a Session

`POST /mcp`

- Auth: user id taken from header `x-user-id` (or from your auth middleware, depending on your setup).  
- Response:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

The server stores:

```text
session:{sessionId}:owner -> userId
```

### Check Session Ownership

`GET /mcp/:sessionId/check`

- Requires `x-user-id` header.  
- Returns `200` only if the calling user owns the session.

### Ownership Enforcement Middleware

Routes that use `ensureSessionOwner` will:

- Return `401` if no user id is present.  
- Return `400` if `sessionId` is missing.  
- Return `403` if the user does not own the session.

## Redis CLI Helpers

Quick commands for inspecting sessions:

```bash
# List all session owners
redis-cli KEYS "session:*:owner"

# Check one session
redis-cli GET "session:{sessionId}:owner"

# See if a session has active subscribers
redis-cli PUBSUB NUMSUB "mcp:shttp:toserver:{sessionId}"

# Monitor live session-related commands
redis-cli MONITOR | grep "session:"
```

## Tests

If you use the example Jest tests for header‑based auth and Redis ownership:

```bash
npm test -- --testNamePattern="Session Ownership"
npm test -- --testNamePattern="User Session Isolation"
```

These tests typically:

- Create a session as one user.  
- Confirm the same user can access it.  
- Confirm a different user receives `403`.

## Cipher Tube Assembly (CTA)

This repo also contains:

- A technical concept for **Cipher Tube Assembly**:  
  12 hash‑lock tubes (integrity layers) and 13 encryption layers wrapped in an outer “What Happened” audit envelope.  
- LaTeX and IEEE‑style templates to generate a whitepaper PDF.  
- Pseudocode describing the build (encryption) and verify (decryption) phases.

The CTA material can be used as a reference design for future cryptographic modules or for research/publishing.

## License and Attribution

Unless otherwise noted:

- **Cipher Tube Assembly** design and documentation  
  © 2025 Jesse Mckane Gonzales.  
  Licensed under **Creative Commons Attribution–ShareAlike 4.0 International (CC BY‑SA 4.0)**.

For code in this repository, you can adapt or replace the license section with your preferred software license (MIT, Apache‑2.0, etc.).

***

If you tell which files you actually have in your repo (names/paths), a more tailored README can reference them directly.

Citations:
[1] ReadMe Template (MS Word) https://klariti.com/readme-template-ms-word/
[2] README template guide - The Good Docs Project https://www.thegooddocsproject.dev/template/readme
[3] Make a README https://www.makeareadme.com
[4] README Files for Internal Projects - InCycle Software https://blogs.incyclesoftware.com/readme-files-for-internal-projects
[5] README Template - InnerSource Patterns https://patterns.innersourcecommons.org/appendix/extras/readme-template
[6] othneildrew/Best-README-Template: An awesome ... - GitHub https://github.com/othneildrew/Best-README-Template
[7] Writing READMEs for Research Data - Cornell Data Services https://data.research.cornell.edu/data-management/sharing/readme/
[8] How to Structure Your README File – README Template Example https://www.freecodecamp.org/news/how-to-structure-your-readme-file/
[9] Does anyone also know of a good template that follows some sort of ... https://www.reddit.com/r/technicalwriting/comments/wz996u/does_anyone_also_know_of_a_good_template_that/
[10] README Files - Harvard Biomedical Data Management https://datamanagement.hms.harvard.edu/collect-analyze/documentation-metadata/readme-files
