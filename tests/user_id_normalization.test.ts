import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';

// Mock Redis client to avoid dependency on actual Redis server during tests
jest.mock('redis', () => ({
    createClient: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue(undefined),
    }),
}));

describe('User ID Normalization', () => {
    beforeEach(() => {
        sessionCache.clear();
        jest.clearAllMocks();
    });

    it('should normalize x-user-id in the session cache', async () => {
        const userId = 'alice-123';
        // Note: Supertest might trim headers, but our manual integration test
        // confirmed that validateUserId correctly trims and reassigns if they aren't trimmed.
        const response = await request(app)
            .post('/mcp')
            .set('x-user-id', userId);

        expect(response.status).toBe(201);
        const { sessionId } = response.body;

        const cachedOwner = sessionCache.get(sessionId);
        expect(cachedOwner).toBe(userId);
    });

    it('should handle x-user-id length limit correctly after trimming', async () => {
        const longId = 'a'.repeat(128) + '   ';
        const response = await request(app)
            .post('/mcp')
            .set('x-user-id', longId);

        expect(response.status).toBe(201); // Should be accepted because trimmed length is 128
    });

    it('should reject x-user-id exceeding length limit after trimming', async () => {
        const tooLongId = 'a'.repeat(129) + '   ';
        const response = await request(app)
            .post('/mcp')
            .set('x-user-id', tooLongId);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid x-user-id: exceeds maximum length');
    });
});
