import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Session Extension and Activity Refresh', () => {
  const userId = 'test-user-ext';
  let sessionId: string;
  let redisMock: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { createClient } = require('redis');
    redisMock = createClient();

    // Create a session
    const response = await request(app)
      .post('/mcp')
      .set('x-user-id', userId);

    sessionId = response.body.sessionId;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    redisMock.get.mockResolvedValue(userId);
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('Sliding Session (Activity Refresh)', () => {
    it('should extend TTL on every authorized request (cache miss)', async () => {
      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(redisMock.get).toHaveBeenCalledWith(`session:${sessionId}:owner`);
      expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should extend TTL on every authorized request (cache hit)', async () => {
      // Warm up cache
      await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', userId);

      jest.clearAllMocks();

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(redisMock.get).not.toHaveBeenCalled(); // Should hit cache
      expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });
  });

  describe('POST /session/:sessionId/extend', () => {
    it('should manually extend the session', async () => {
      const response = await request(app)
        .post(`/session/${sessionId}/extend`)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Session extended successfully',
        expiresIn: 3600
      });
      expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should return 403 if user does not own the session', async () => {
      redisMock.get.mockResolvedValue('different-user');
      const response = await request(app)
        .post(`/session/${sessionId}/extend`)
        .set('x-user-id', userId);

      expect(response.status).toBe(403);
      expect(redisMock.expire).not.toHaveBeenCalled();
    });
  });
});
