import request from 'supertest';
import { app } from '../src/server';

describe('Server Security and Health', () => {
  it('should have security headers from helmet', async () => {
    const response = await request(app).get('/health');

    // Check for some common helmet headers
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('should NOT have x-powered-by header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should return ok from /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should reject large JSON payloads', async () => {
    // Create a payload larger than 10kb
    const largePayload = {
      data: 'a'.repeat(11 * 1024)
    };

    const response = await request(app)
      .post('/mcp') // Route with JSON parser
      .set('x-user-id', 'test-user')
      .send(largePayload);

    expect(response.status).toBe(413);
  });
});
