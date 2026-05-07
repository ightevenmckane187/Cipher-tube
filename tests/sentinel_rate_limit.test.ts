import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client to avoid connection issues
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('user-id'), // Mock session owner
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Rate Limiting Security', () => {
  it('should return JSON error for rate limited requests', async () => {
    // Note: sessionLimiter is 100 per 15 mins.
    // We hit it 101 times to trigger the 429.
    // This might be slow but it's a direct verification.

    const sessionId = '550e8400-e29b-41d4-4716-446655440000';

    // We use a smaller loop if we can, but the limit is 100.
    // Let's try 101 requests.
    for (let i = 0; i < 100; i++) {
        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', 'user-id');
    }

    const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user-id');

    expect(response.status).toBe(429);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: 'Too many requests, please try again later.' });
  }, 20000); // Increase timeout for 100 requests
});
