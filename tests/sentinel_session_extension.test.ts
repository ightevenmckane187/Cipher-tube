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

describe('Sentinel Session Extension', () => {
    const userId = 'user-123';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
        redisMock.get.mockResolvedValue(userId);
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    it('should extend session TTL on every authorized request (Sliding Session)', async () => {
        // Request 1: Triggering Redis lookup
        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);

        // Request 2: Triggering Cache hit
        jest.clearAllMocks();
        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should explicitly extend session via POST /session/:sessionId/extend', async () => {
        const res = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: 'Session extended',
            expiresIn: 3600
        });
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should return 403 and NOT extend TTL if unauthorized', async () => {
        await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', 'wrong-user');

        expect(redisMock.expire).not.toHaveBeenCalled();
    });
});
