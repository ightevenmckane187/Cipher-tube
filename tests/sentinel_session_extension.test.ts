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

describe('Sentinel: Session Extension and Activity Refresh', () => {
    const userId = 'sentinel-user';
    const otherUserId = 'malicious-user';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
        redisMock.get.mockImplementation((key: string) => {
            if (key.includes(sessionId)) return Promise.resolve(userId);
            return Promise.resolve(null);
        });
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    describe('Activity Refresh in ensureSessionOwner', () => {
        it('should refresh session TTL on successful ownership verification (Redis hit)', async () => {
            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, expect.any(Number));
        });

        it('should NOT refresh session TTL if ownership check fails (wrong user)', async () => {
            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', otherUserId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });

        it('should NOT refresh session TTL if session is not found', async () => {
            const res = await request(app)
                .get(`/mcp/00000000-0000-4000-8000-000000000000/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(404);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });
    });

    describe('POST /session/:sessionId/extend', () => {
        it('should successfully extend session for the owner', async () => {
            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('successfully');
            // expire is called twice: once in ensureSessionOwner and once in the handler
            expect(redisMock.expire).toHaveBeenCalledTimes(2);
        });

        it('should return 403 if non-owner tries to extend session', async () => {
            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', otherUserId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid sessionId format', async () => {
            const res = await request(app)
                .post(`/session/invalid-id/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(400);
        });
    });
});
