import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';
import crypto from 'crypto';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel: Session Extension (Activity Refresh)', () => {
    const userId = 'test-user';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();

        // Default mock behaviors
        redisMock.get.mockResolvedValue(userId);
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    it('should extend session TTL on Redis hit (middleware)', async () => {
        // Ensure cache is empty
        sessionCache.clear();

        const response = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(response.status).toBe(200);
        expect(redisMock.get).toHaveBeenCalledWith(`session:${sessionId}:owner`);
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should extend session TTL on Cache hit (middleware)', async () => {
        // Pre-populate cache
        sessionCache.set(sessionId, userId);

        const response = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(response.status).toBe(200);
        // Should NOT call redis.get due to cache hit
        expect(redisMock.get).not.toHaveBeenCalled();
        // Should STILL call redis.expire
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should NOT extend session TTL if ownership check fails', async () => {
        redisMock.get.mockResolvedValue('different-user');

        const response = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(response.status).toBe(403);
        expect(redisMock.expire).not.toHaveBeenCalled();
    });
});
