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

describe('Sentinel: Session Extension and Activity Refresh', () => {
    const userId = 'test-user';
    const sessionId = '550e8400-e29b-41d4-8716-446655440000';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();

        // Mock session ownership
        redisMock.get.mockImplementation((key: string) => {
            if (key === `session:${sessionId}:owner`) return Promise.resolve(userId);
            return Promise.resolve(null);
        });
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    it('should have a POST /session/:sessionId/extend endpoint', async () => {
        const res = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        // This is expected to fail (404) before implementation
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Session extended');
    });

    it('should extend Redis TTL on every authorized request (Activity Refresh)', async () => {
        const res = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        // This is expected to fail before implementation
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });
});
