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

describe('Session Extension API', () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();

        // Default mock for ownership check
        redisMock.get.mockImplementation((key: string) => {
            if (key === `session:${sessionId}:owner`) return Promise.resolve(userId);
            return Promise.resolve(null);
        });
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    describe('POST /session/:sessionId/extend', () => {
        it('should successfully extend a session for the owner', async () => {
            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session extended successfully');
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should return 403 if a different user tries to extend the session', async () => {
            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', otherUserId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });

        it('should return 404 if the session does not exist', async () => {
            const nonExistentId = '550e8400-e29b-41d4-8716-446655440001';
            const res = await request(app)
                .post(`/session/${nonExistentId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(404);
        });
    });

    describe('Activity Refresh in ensureSessionOwner', () => {
        it('should trigger an expiration extension during other authenticated requests (e.g., check)', async () => {
            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            // ensureSessionOwner should call expire
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should trigger an expiration extension even when session is cached in memory', async () => {
            // First request to populate cache
            await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(redisMock.expire).toHaveBeenCalledTimes(1);

            // Second request should use cache but still call expire
            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledTimes(2);
        });
    });
});
