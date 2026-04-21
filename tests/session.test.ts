import request from 'supertest';
import { app, redisClient } from '../src/server';

describe('Session Ownership API', () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';

    afterAll(async () => {
        await redisClient.quit();
    });

    it('should create a session for a user', async () => {
        const res = await request(app)
            .post('/mcp')
            .set('x-user-id', userId);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('sessionId');

        const owner = await redisClient.get(`session:${res.body.sessionId}:owner`);
        expect(owner).toBe(userId);
    });

    it('should return 401 if x-user-id is missing during creation', async () => {
        const res = await request(app).post('/mcp');
        expect(res.status).toBe(401);
    });

    it('should allow the owner to check their session', async () => {
        const createRes = await request(app)
            .post('/mcp')
            .set('x-user-id', userId);

        const sessionId = createRes.body.sessionId;

        const checkRes = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(checkRes.status).toBe(200);
        expect(checkRes.body.status).toBe('owned');
    });

    it('should return 403 if a different user checks the session', async () => {
        const createRes = await request(app)
            .post('/mcp')
            .set('x-user-id', userId);

        const sessionId = createRes.body.sessionId;

        const checkRes = await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', otherUserId);

        expect(checkRes.status).toBe(403);
    });

    it('should return 404 if the session does not exist', async () => {
        const checkRes = await request(app)
            .get('/mcp/non-existent-session/check')
            .set('x-user-id', userId);

        expect(checkRes.status).toBe(404);
    });
});
