import request from 'supertest';
import { app } from '../src/server';
import { createClient } from 'redis';

// Mock Redis client
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

describe('Sentinel Security Enhancements', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
  });

  describe('404 JSON Response', () => {
    it('should return a JSON 404 response for unknown routes', async () => {
      const response = await request(app).get('/some-random-unknown-route');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual({ error: 'Not Found' });
    });
  });

  describe('x-user-id Header Normalization', () => {
    it('should trim whitespace from x-user-id header', async () => {
      const userIdWithSpaces = '  user-123  ';
      redisMock.set.mockResolvedValue('OK');

      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', userIdWithSpaces);

      expect(response.status).toBe(201);
      expect(response.body.sessionId).toBeDefined();
    });

    it('should reject x-user-id if it only contains whitespace', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', '   ');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing or invalid x-user-id');
    });
  });
});
