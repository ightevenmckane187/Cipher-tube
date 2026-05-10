import request from 'supertest';
import { app } from '../src/server';

describe('Global Error Handling', () => {
  it('should return 400 for malformed JSON instead of leaking details', async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('x-user-id', 'test-user')
      .send('{"invalid": json}'); // Malformed JSON

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    // Without global error handler, Express might return HTML with stack trace or a different JSON structure
  });

  it('should return 413 for oversized payloads', async () => {
    const oversizedBody = { data: 'a'.repeat(20000) }; // > 10kb
    const response = await request(app)
      .post('/mcp')
      .set('x-user-id', 'test-user')
      .send(oversizedBody);

    expect(response.status).toBe(413);
    expect(response.body.error).toContain('Payload too large');
  });
});
