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

describe('Sentinel Session Extension & Activity Refresh', () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    describe('POST /session/:sessionId/extend', () => {
        it('should allow the owner to extend their session', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session extended successfully');
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, expect.any(Number));
        });

        it('should return 403 if a different user tries to extend the session', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', otherUserId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });

        it('should return 404 if the session does not exist', async () => {
            redisMock.get.mockResolvedValueOnce(null);

            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(404);
        });
    });

    describe('Activity Refresh (Sliding Session)', () => {
        it('should refresh TTL on GET /mcp/:sessionId/check (cache miss)', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, expect.any(Number));
        });

        it('should refresh TTL on GET /mcp/:sessionId/check (cache hit)', async () => {
            // Prime the cache
            sessionCache.set(sessionId, userId);

            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            // In ensureSessionOwner, cache hit calls expire without await and ignores errors
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, expect.any(Number));
        });

        it('should refresh TTL on expensive operations like /encrypt', async () => {
            redisMock.get.mockResolvedValueOnce(userId);
            const masterSeed = '0'.repeat(64);

            const res = await request(app)
                .post(`/mcp/${sessionId}/encrypt`)
                .set('x-user-id', userId)
                .send({
                    message: 'test message',
                    masterSeed: masterSeed
                });

            expect(res.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, expect.any(Number));
        });
    });
});
