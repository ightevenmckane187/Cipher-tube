import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';
import crypto from 'crypto';
import { getBlindedRedisKey } from '../src/session_rotator';

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
            // Default mock behavior for blinded keys
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

        const expectedBlindedKey = getBlindedRedisKey(res.body.sessionId);
        expect(redisMock.set).toHaveBeenCalledWith(
            expectedBlindedKey,
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
        const sessionId = '550e8400-e29b-41d4-8716-446655440000';
        const blindedKey = getBlindedRedisKey(sessionId);

        // Mock redisClient.get to return the owner when called with blinded key
        redisMock.get.mockImplementation((key: string) => {
            if (key === blindedKey) return Promise.resolve(userId);
            return Promise.resolve(null);
        });

        const sessionToken = sessionId;
        const checkRes = await request(app)
            .get(`/mcp/check`)
            .set('x-user-id', userId)
            .set('x-session-token', sessionToken);

        expect(checkRes.status).toBe(200);
        expect(checkRes.body.status).toBe('owned');
        expect(redisMock.get).toHaveBeenCalledWith(blindedKey);
    });

    it('should return 403 if a different user checks the session', async () => {
        const sessionToken = '550e8400-e29b-41d4-8716-446655440000';
        redisMock.get.mockResolvedValueOnce(userId);

        const checkRes = await request(app)
            .get(`/mcp/check`)
            .set('x-user-id', otherUserId)
            .set('x-session-token', sessionToken);

        expect(checkRes.status).toBe(403);
    });

    it('should return 404 if the session does not exist', async () => {
        const sessionToken = '550e8400-e29b-41d4-8716-446655440004';
        redisMock.get.mockResolvedValueOnce(null);

        const checkRes = await request(app)
            .get(`/mcp/check`)
            .set('x-user-id', userId)
            .set('x-session-token', sessionToken);

        expect(checkRes.status).toBe(404);
    });
});
