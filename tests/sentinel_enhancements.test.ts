import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client to prevent connection errors during tests
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel Enhancements', () => {
  describe('Catch-all 404 Middleware', () => {
    it('should return 404 JSON for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Not Found' });
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should still allow known routes (health check)', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('x-user-id Header Normalization', () => {
    it('should trim whitespace from x-user-id and accept it', async () => {
      // We use a route that uses validateUserId, like POST /mcp
      // Note: supertest might trim headers automatically in some versions,
      // but we want to verify the server-side logic.
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', '  valid-user  ');

      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
    });

    it('should reject x-user-id that is too long after trimming', async () => {
      const longUserId = ' ' + 'a'.repeat(128) + ' '; // 130 chars total, 128 after trim
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', longUserId);

      expect(response.status).toBe(201); // 128 is allowed

      const tooLongUserId = ' ' + 'a'.repeat(129) + ' '; // 131 chars total, 129 after trim
      const response2 = await request(app)
        .post('/mcp')
        .set('x-user-id', tooLongUserId);

      expect(response2.status).toBe(400);
      expect(response2.body.error).toContain('exceeds maximum length');
    });

    it('should reject x-user-id that is only whitespace', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', '   ');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing or invalid x-user-id');
    });
  });
});
