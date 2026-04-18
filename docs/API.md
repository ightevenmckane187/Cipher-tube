# API Reference

## Session Endpoints

### Create Session
`POST /mcp`

Creates a new session for the authenticated user.

**Headers:**
- `x-user-id`: The ID of the user creating the session.

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Check Session
`GET /mcp/:sessionId/check`

Verifies if the current user owns the specified session.

**Headers:**
- `x-user-id`: The ID of the user checking ownership.

**Response:**
- `200 OK`: If the user owns the session.
- `403 Forbidden`: If the user does not own the session.
- `401 Unauthorized`: If no user ID is provided.
