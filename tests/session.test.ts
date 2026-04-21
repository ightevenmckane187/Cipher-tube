import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';
import crypto from 'crypto';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Session Ownership API', () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';
    let redisMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionCache.clear();
        const { createClient } = require('redis');
        redisMock = createClient();
        redisMock.get.mockImplementation((key: string) => {
            if (key.includes('non-existent') || key.includes('440004')) return Promise.resolve(null);
            return Promise.resolve(userId);
        });
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    it('should create a session for a user', async () => {
        const res = await request(app)
            .post('/mcp')
            .set('x-user-id', userId);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('sessionId');

        expect(redisMock.set).toHaveBeenCalledWith(
            expect.stringContaining(`session:${res.body.sessionId}:owner`),
            userId,
            expect.any(Object)
        );
    });

    it('should return 401 if x-user-id is missing during creation', async () => {
        const res = await request(app).post('/mcp');
        expect(res.status).toBe(401);
    });

    it('should allow the owner to check their session', async () => {
        // We use a real UUID for sessionId to satisfy validation
        const sessionId = '550e8400-e29b-41d4-a716-446655440000';

        // Mock redisClient.get to return the owner
        redisMock.get.mockResolvedValueOnce(userId);

        const checkRes = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(checkRes.status).toBe(200);
        expect(checkRes.body.status).toBe('owned');
    });

    it('should return 403 if a different user checks the session', async () => {
        const sessionId = '550e8400-e29b-41d4-a716-446655440000';

        // Mock redisClient.get to return the original owner
        redisMock.get.mockResolvedValueOnce(userId);

        const checkRes = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', otherUserId);

        expect(checkRes.status).toBe(403);
    });

    it('should return 404 if the session does not exist', async () => {
        const sessionId = '550e8400-e29b-41d4-a716-446655440004';
        redisMock.get.mockResolvedValueOnce(null);

        const checkRes = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(checkRes.status).toBe(404);
    });
});
