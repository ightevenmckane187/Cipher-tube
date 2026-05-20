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

describe('Sentinel Session Extension Integration', () => {
  const userId = 'sentinel-user';
  const otherUserId = 'imposter-user';
  let redisMock: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { createClient } = require('redis');
    redisMock = createClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    redisMock.get.mockResolvedValue(userId);
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('Activity Refresh (Sliding Session) via Middleware', () => {
    it('should extend Redis TTL on successful session check', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(redisMock.expire).toHaveBeenCalledWith(
        `session:${sessionId}:owner`,
        3600
      );
    });

    it('should NOT extend Redis TTL if ownership check fails (403)', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', otherUserId);

      expect(response.status).toBe(403);
      expect(redisMock.expire).not.toHaveBeenCalled();
    });
  });

  describe('Manual Session Extension Endpoint', () => {
    it('should extend Redis TTL via POST /session/:sessionId/extend', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .post(`/session/${sessionId}/extend`)
        .set('x-user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Session extended successfully',
        status: 'extended'
      });
      expect(redisMock.expire).toHaveBeenCalledWith(
        `session:${sessionId}:owner`,
        3600
      );
    });

    it('should return 404 for extension if session does not exist', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      redisMock.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/session/${sessionId}/extend`)
        .set('x-user-id', userId);

      expect(response.status).toBe(404);
      expect(redisMock.expire).not.toHaveBeenCalled();
    });
  });
});
