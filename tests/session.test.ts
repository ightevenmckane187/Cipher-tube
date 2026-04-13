import request from 'supertest';
import { app, redisClient } from '../src/server';

// Mock redis client
jest.mock('redis', () => ({
    createClient: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        set: jest.fn(),
        flushAll: jest.fn(),
        quit: jest.fn(),
        on: jest.fn(),
        isOpen: true
    })
}));

describe('Session Ownership', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    it('should create a session and return 201', async () => {
        (redisClient.set as jest.Mock).mockResolvedValue('OK');

        const response = await request(app)
            .post('/mcp')
            .set('x-user-id', 'user123');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('sessionId');
        expect(redisClient.set).toHaveBeenCalledWith(expect.stringContaining('session:'), 'user123');
    });

    it('should return 401 when creating a session without user ID', async () => {
        const response = await request(app)
            .post('/mcp');

        expect(response.status).toBe(401);
    });

    it('should allow the owner to check session status', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue('user123');

        const checkRes = await request(app)
            .get('/mcp/some-session/check')
            .set('x-user-id', 'user123');

        expect(checkRes.status).toBe(200);
        expect(checkRes.body.message).toBe('You own this session');
    });

    it('should forbid non-owners from checking session status', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue('user123');

        const checkRes = await request(app)
            .get('/mcp/some-session/check')
            .set('x-user-id', 'otherUser');

        expect(checkRes.status).toBe(403);
        expect(checkRes.body.error).toBe('Forbidden: You do not own this session');
    });

    it('should return 404 for non-existent session', async () => {
        (redisClient.get as jest.Mock).mockResolvedValue(null);

        const checkRes = await request(app)
            .get('/mcp/nonexistent/check')
            .set('x-user-id', 'user123');

        expect(checkRes.status).toBe(404);
        expect(checkRes.body.error).toBe('Session not found');
    });
});
