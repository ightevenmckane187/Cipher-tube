import request from 'supertest';
import { app } from '../src/server';

describe('Session Token Length Validation', () => {
  it('should reject x-session-token exceeding 256 characters', async () => {
    const longToken = 'a'.repeat(257);
    const response = await request(app)
      .get('/mcp/check')
      .set('x-user-id', 'test-user')
      .set('x-session-token', longToken);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid x-session-token: exceeds maximum length');
  });

  it('should allow valid x-session-token length', async () => {
    // This will still fail with 401/404 because the session doesn't exist,
    // but it should NOT fail with the 400 length error.
    const validToken = 'a'.repeat(36); // UUID length
    const response = await request(app)
      .get('/mcp/check')
      .set('x-user-id', 'test-user')
      .set('x-session-token', validToken);

    expect(response.status).not.toBe(400);
  });
});
