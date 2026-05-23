import request from 'supertest';
import { app, sessionCache } from '../src/server';

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

    it('should extend session TTL on /mcp/:sessionId/check (Activity Refresh)', async () => {
        const res = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should extend session TTL via /session/:sessionId/extend endpoint', async () => {
        const res = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Session extended');
        expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
    });

    it('should return 403 if trying to extend a session owned by someone else', async () => {
        redisMock.get.mockResolvedValue('other-user');

        const res = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        expect(res.status).toBe(403);
        expect(redisMock.expire).not.toHaveBeenCalled();
    });
});
