import request from 'supertest';
import { app } from '../src/server';

describe('Sentinel Security Enhancements', () => {
  describe('404 Handling', () => {
    it('should return JSON 404 for unknown routes', async () => {
      const response = await request(app).get('/undefined-endpoint');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual({ error: 'Not Found' });
    });
  });

  describe('Security Headers', () => {
    it('should have no-cache headers on sensitive endpoints', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', 'test-user')
        .send({});

      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['pragma']).toBe('no-cache');
    });

    it('should have Permissions-Policy header', async () => {
      const response = await request(app).get('/');
      expect(response.headers['permissions-policy']).toBeDefined();
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
    });
  });
});
