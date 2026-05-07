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
});
