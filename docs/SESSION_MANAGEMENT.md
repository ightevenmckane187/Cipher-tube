# Session Management

Cipher Tube uses Redis for high-performance session tracking and ownership enforcement.

## Architecture

1. **Session Creation**: When a user logs in, a unique `sessionId` (UUID v4) is generated.
2. **Ownership Mapping**: The session is stored in Redis as `session:{sessionId}:owner`, mapped to the `userId`.
3. **Validation**: Every request to a protected endpoint must include the `sessionId` and the `x-user-id` header. Our middleware verifies that the user ID matches the owner stored in Redis.

## v1.5.0 Improvements

- **Reliable Timeouts**: Fixed an issue where sessions would expire prematurely. TTL (Time To Live) is now correctly set to 24 hours by default.
- **Activity Refresh**: Sessions now refresh their TTL on every active request, providing a seamless experience for active users.
- **Secure Logging**: Redis connection errors are now sanitized to prevent leaking sensitive credentials in log files.
