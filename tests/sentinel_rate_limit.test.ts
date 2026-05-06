import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client to avoid connection issues
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('user-id'), // Mock get for session ownership
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Rate Limit Security', () => {
  it('should return JSON error for rate limit exceeded on /mcp', async () => {
    // sessionLimiter has max: 100
    // We make 100 requests, they should pass (or fail with other errors, but not 429)
    // The 101st request should fail with 429.

    // Using a loop to make requests.
    // We don't need to wait for each one if we use Promise.all,
    // but sequential might be safer for rate limiting tracking in-memory.

    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/mcp')
        .set('x-user-id', 'test-user')
        .send({ some: 'data' });
    }

    const response = await request(app)
      .post('/mcp')
      .set('x-user-id', 'test-user')
      .send({ some: 'data' });

    expect(response.status).toBe(429);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: 'Too many requests, please try again later.' });
  }, 20000); // Increase timeout for 100 requests
});
