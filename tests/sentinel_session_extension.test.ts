import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';

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

describe('Sentinel: Session Activity Refresh and Extension', () => {
    const userId = 'sentinel-user';
    const sessionId = '550e8400-e29b-41d4-8716-446655440005';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
    });

    describe('Activity Refresh (Sliding Session)', () => {
        it('should extend Redis TTL on successful authorization (cache miss)', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should extend Redis TTL on successful authorization (cache hit)', async () => {
            sessionCache.set(sessionId, userId);

            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(redisMock.get).not.toHaveBeenCalled();
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should NOT extend Redis TTL if authorization fails', async () => {
            redisMock.get.mockResolvedValueOnce('different-user');

            const res = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });
    });

    describe('POST /session/:sessionId/extend', () => {
        it('should allow manual session extension for owner', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session successfully extended');
            expect(res.body.expiresIn).toBe(3600);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should return 401 if x-user-id is missing', async () => {
            const res = await request(app)
                .post(`/session/${sessionId}/extend`);

            expect(res.status).toBe(401);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });

        it('should return 403 if non-owner tries to extend', async () => {
            redisMock.get.mockResolvedValueOnce('other-user');

            const res = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', userId);

            expect(res.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });
    });
});
