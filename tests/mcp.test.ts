import request from 'supertest';
import { app, sessionCache } from '../src/server';
import { blindToken } from '../src/session_rotator';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
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
    sessionCache.clear();
    redisMock = (createClient as jest.Mock)();
  });

  describe('POST /mcp', () => {
    it('should create a session for a valid user', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', 'user123');

      expect(response.status).toBe(201);
      expect(response.body.sessionToken).toBeDefined();
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringMatching(/^session:[0-9a-f]{64}:owner$/),
        'user123',
        { EX: 3600 }
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
      expect(response.body.error).toContain('exceeds maximum length');
    });
  });

  describe('GET /mcp/check', () => {
    it('should verify ownership for the correct user', async () => {
      const sessionToken = 'test-token';
      const blindedKey = blindToken(sessionToken);
      redisMock.get.mockResolvedValueOnce('user123');

      const response = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'user123')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session ownership verified');
    });

    it('should return 403 for the wrong user', async () => {
      const sessionToken = 'test-token';
      redisMock.get.mockResolvedValueOnce('user123');

      const response = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'otherUser')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(403);
    });

    it('should return 404 for a non-existent session', async () => {
      const sessionToken = 'non-existent';
      redisMock.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'user123')
        .set('x-session-token', sessionToken);

      expect(response.status).toBe(404);
    });

    it('should return 400 if x-user-id is too long on check', async () => {
      const sessionToken = 'test-token';
      const longUserId = 'a'.repeat(129);
      const response = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', longUserId)
        .set('x-session-token', sessionToken);
      expect(response.status).toBe(400);
    });

    it('should use in-memory cache for subsequent requests (Bolt Optimization)', async () => {
      const sessionToken = 'test-token';
      redisMock.get.mockResolvedValueOnce('user456');

      // First request - hits Redis
      const resp1 = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'user456')
        .set('x-session-token', sessionToken);
      expect(resp1.status).toBe(200);

      // Second request - should hit cache
      const resp2 = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'user456')
        .set('x-session-token', sessionToken);
      expect(resp2.status).toBe(200);

      // Verify Redis was only called once for this specific session
      expect(redisMock.get).toHaveBeenCalledTimes(1);
    });

    it('should pre-warm the cache during session creation (Bolt Optimization)', async () => {
      // Create session
      const createResponse = await request(app)
        .post('/mcp')
        .set('x-user-id', 'prewarm-user');

      const sessionToken = createResponse.body.sessionToken;
      expect(sessionToken).toBeDefined();

      // Clear call history to isolate the check request
      redisMock.get.mockClear();

      // Check session - should hit pre-warmed cache and NOT call Redis
      const checkResponse = await request(app)
        .get(`/mcp/check`)
        .set('x-user-id', 'prewarm-user')
        .set('x-session-token', sessionToken);

      expect(checkResponse.status).toBe(200);
      expect(redisMock.get).not.toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('should return the landing page with semantic structure', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Cipher Tube Assembly');
      expect(response.text).toContain('<main id="main-content">');
      expect(response.text).toContain('<button class="theme-toggle"');
      expect(response.text).toContain('<footer');
      expect(response.text).toContain('Quick Start');
      expect(response.text).toContain('Health Check');
    });
  });
});
