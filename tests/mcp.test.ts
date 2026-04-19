import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

import { createClient } from 'redis';

describe('MCP Session Management', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
  });

  describe('POST /mcp', () => {
    it('should create a session for a valid user', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', 'user123');

      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining(response.body.sessionId),
        'user123',
        { EX: 86400 }
      );
    });

    it('should return 401 if x-user-id is missing', async () => {
      const response = await request(app).post('/mcp');
      expect(response.status).toBe(401);
    });

    it('should return 400 if x-user-id is too long', async () => {
      const longUserId = 'a'.repeat(129);
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', longUserId);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid x-user-id');
    });
  });

  describe('GET /mcp/:sessionId/check', () => {
    it('should verify ownership for the correct user', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440001';
      redisMock.get.mockResolvedValueOnce('user123');

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session ownership verified');
    });

    it('should return 403 for the wrong user', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440002';
      redisMock.get.mockResolvedValueOnce('user123');

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'otherUser');

      expect(response.status).toBe(403);
    });

    it('should return 404 for a non-existent session', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440003';
      redisMock.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user123');

      expect(response.status).toBe(404);
    });

    it('should use in-memory cache for subsequent requests (Bolt Optimization)', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440004';
      redisMock.get.mockResolvedValueOnce('user456');

      // First request - hits Redis
      const resp1 = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user456');
      expect(resp1.status).toBe(200);

      // Second request - should hit cache
      const resp2 = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user456');
      expect(resp2.status).toBe(200);

      // Verify Redis was only called once for this specific session
      expect(redisMock.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /', () => {
    it('should return the landing page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Cipher Tube Assembly');
    });
  });
});
