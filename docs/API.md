# API Reference

## Session Endpoints

### Create Session
`POST /mcp`

Creates a new session for the authenticated user.

**Headers:**
- `x-user-id`: The ID of the user creating the session.

**Response (201 Created):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionToken": "..."
}
```

### Check Session
`GET /mcp/check` (and legacy `GET /mcp/:sessionId/check`)

Verifies if the current user owns the specified session.

**Headers:**
- `x-user-id`: The ID of the user checking ownership.
- `x-session-token`: The session token to verify.

**Response:**
- `200 OK`: If the user owns the session.
- `403 Forbidden`: If the user does not own the session.
- `404 Not Found`: If the session does not exist.
- `401 Unauthorized`: If required headers are missing.

### Rotate Session
`POST /mcp/rotate`

Rotates the current session token to a fresh one and invalidates the old one.

**Headers:**
- `x-user-id`: The ID of the user.
- `x-session-token`: The current session token.

**Response (200 OK):**
```json
{
  "newToken": "..."
}
```

### Extend Session
`POST /session/extend`

Explicitly extends the session TTL in Redis. Note: Every authorized request also automatically extends the session TTL (Activity Refresh).

**Headers:**
- `x-user-id`: The ID of the user.
- `x-session-token`: The session token to extend.

**Response (200 OK):**
```json
{
  "message": "Session extended successfully",
  "expiresIn": 3600
}
```

## Cryptographic Endpoints (CTA)

### Encrypt Message
`POST /mcp/encrypt`

Encrypts a message using the Cipher Tube Assembly (CTA) logic.

**Headers:**
- `x-user-id`: The ID of the user.
- `x-session-token`: The session token.

**Payload:**
```json
{
  "message": "Your secret message",
  "masterSeed": "64-character-hex-string"
}
```

**Response (200 OK):**
Returns the result of `buildCipherTube`, including ciphertext and tube metadata.

### Decrypt Message
`POST /mcp/decrypt`

Decrypts a message using the Cipher Tube Assembly (CTA) logic.

**Headers:**
- `x-user-id`: The ID of the user.
- `x-session-token`: The session token.

**Payload:**
```json
{
  "ciphertext": "...",
  "masterSeed": "64-character-hex-string",
  "tubes": []
}
```

**Response (200 OK):**
Returns the decrypted message.

## Data Plane Endpoints

### Ingest Packet
`POST /mcp/packet`

Ingests and validates the structure of a zero-knowledge payload envelope.

**Headers:**
- `x-user-id`: The ID of the user.
- `x-session-token`: The session token.
- `x-cipher-proof` (Optional): A cryptographic proof to verify.

**Payload:**
```json
{
  "chunk_index": 0,
  "blinded_session_hash": "...",
  "crypto_envelope": {
    "iv": "...",
    "auth_tag": "...",
    "ciphertext_blob": "..."
  }
}
```

**Response (200 OK):**
```json
{
  "target_stream": "...",
  "sequence": 0,
  "dispatch_ready": true
}
```

## Gateway Endpoints

### System Analytics
`GET /system/analytics` (on GATEWAY_PORT, default 8080)

Exposes core state diagnostics and cache performance metrics safely.

**Response (200 OK):**
```json
{
  "component": "Cipher-Tube Cryptographic Gateway",
  "status": "Fully Operational",
  "timestamp": 1234567890,
  "metrics": {
    "engineUptime": 1234.5,
    "memoryUsage": 56789,
    "cachePoolActive": true
  }
}
```

### Verify Channel
`POST /v1/channel/verify` (on GATEWAY_PORT, default 8080)

Mounts the zero-knowledge structural evaluation layer before granting downstream access.

**Response (200 OK):**
```json
{
  "status": "verified",
  "channelState": "secure",
  "tokenSignature": "..."
}
```
