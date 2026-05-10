import request from 'supertest';
import { app } from '../src/server';

describe('JSON Parsing Error Handling', () => {
  it('should return a 400 JSON error for malformed JSON', async () => {
    const response = await request(app)
      .post('/mcp')
      .set('x-user-id', 'test-user')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}'); // Malformed JSON

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid JSON payload'
    });
  });
});
