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
    const userId = 'sentinel-user';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    const SESSION_TTL = 3600;
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();

        // Setup default mocks
        redisMock.get.mockImplementation((key: string) => {
            if (key === `session:${sessionId}:owner`) return Promise.resolve(userId);
            return Promise.resolve(null);
        });
    });

    it('should extend session TTL on every authorized request (Activity Refresh)', async () => {
        const res = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, SESSION_TTL);
    });

    it('should extend session TTL when using the explicit extend endpoint', async () => {
        const res = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: 'Session extended',
            expiresIn: SESSION_TTL
        });
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, SESSION_TTL);
    });

    it('should NOT extend session TTL if ownership verification fails (Forbidden)', async () => {
        const res = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', 'wrong-user');

        expect(res.status).toBe(403);
        expect(redisMock.expire).not.toHaveBeenCalled();
    });

    it('should NOT extend session TTL if session is not found', async () => {
        const unknownSessionId = '00000000-0000-4000-8000-000000000000';
        const res = await request(app)
            .get(`/mcp/${unknownSessionId}/check`)
            .set('x-user-id', userId);

        expect(res.status).toBe(404);
        expect(redisMock.expire).not.toHaveBeenCalled();
    });

    it('should use cached ownership and still extend TTL', async () => {
        // First request to populate cache
        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(redisMock.get).toHaveBeenCalledTimes(1);
        expect(redisMock.expire).toHaveBeenCalledTimes(1);

        // Second request should use cache
        const res = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(redisMock.get).toHaveBeenCalledTimes(1); // No new Redis get
        expect(redisMock.expire).toHaveBeenCalledTimes(2); // Still called expire
    });
});
