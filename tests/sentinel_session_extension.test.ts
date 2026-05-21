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

describe('Sentinel: Session Extension and Activity Refresh', () => {
    const userId = 'sentinel-user-789';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
    });

    describe('Activity Refresh (Sliding Session)', () => {
        it('should extend Redis TTL when ownership is verified from Redis', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const response = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(response.status).toBe(200);
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });

        it('should extend Redis TTL when ownership is verified from in-memory cache', async () => {
            sessionCache.set(sessionId, userId);

            const response = await request(app)
                .get(`/mcp/${sessionId}/check`)
                .set('x-user-id', userId);

            expect(response.status).toBe(200);
            // expire is called in the background (no await) when using cache, but jest should catch it
            expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
        });
    });

    describe('Dedicated Extension Endpoint', () => {
        it('should extend session and return success via POST /session/:sessionId/extend', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

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

        it('should return 403 if unauthorized user attempts extension', async () => {
            redisMock.get.mockResolvedValueOnce(userId);

            const response = await request(app)
                .post(`/session/${sessionId}/extend`)
                .set('x-user-id', 'attacker-user');

            expect(response.status).toBe(403);
            expect(redisMock.expire).not.toHaveBeenCalled();
        });
    });
});
